﻿using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using JsonServices.Events;
using JsonServices.Exceptions;
using JsonServices.Messages;
using JsonServices.Serialization;
using JsonServices.Services;
using JsonServices.Transport;

namespace JsonServices
{
	public class JsonClient : IDisposable, IMessageNameProvider
	{
		public JsonClient(IClient client, ISerializer serializer)
		{
			Client = client ?? throw new ArgumentNullException(nameof(client));
			Serializer = serializer ?? throw new ArgumentNullException(nameof(serializer));
			Serializer.MessageNameProvider = this;
			Client.MessageReceived += HandleClientMessage;
		}

		public bool IsDisposed { get; private set; }

		private IClient Client { get; set; }

		private ISerializer Serializer { get; set; }

		public Task ConnectAsync() => Client.ConnectAsync();

		public void Dispose()
		{
			if (!IsDisposed)
			{
				Client.MessageReceived -= HandleClientMessage;
				Client.Dispose();
				IsDisposed = true;
			}
		}

		internal class PendingMessage
		{
			public string Name { get; set; }
			public TaskCompletionSource<object> CompletionSource { get; set; } =
				new TaskCompletionSource<object>();
		}

		internal ConcurrentDictionary<string, PendingMessage> PendingMessages { get; } =
			new ConcurrentDictionary<string, PendingMessage>();

		public string GetMessageName(string messageId)
		{
			// get request message name by id
			if (PendingMessages.TryGetValue(messageId, out var pmsg))
			{
				return pmsg.Name;
			}

			return null;
		}

		internal async Task<PendingMessage> SendMessage(RequestMessage requestMessage)
		{
			var data = Serializer.Serialize(requestMessage);

			var result = default(PendingMessage);
			if (!requestMessage.IsNotification)
			{
				result = new PendingMessage
				{
					Name = requestMessage.Name,
				};

				PendingMessages[requestMessage.Id] = result;
			}

			await Client.SendAsync(data);
			return result;
		}

		private void HandleClientMessage(object sender, MessageEventArgs args)
		{
			var msg = Serializer.Deserialize(args.Data);

			// match the response with the pending request message
			if (msg is ResponseMessage responseMessage)
			{
				HandleResponseMessage(responseMessage);
				return;
			}

			// handle request message (server-side event)
			HandleRequestMessage((RequestMessage)msg);
		}

		private void HandleResponseMessage(ResponseMessage responseMessage)
		{
			if (!PendingMessages.TryRemove(responseMessage.Id, out var pm))
			{
				// got the unknown answer message
				// cannot throw here because we're on the worker thread
				// TODO: find out what can be done
				return;
			}

			var tcs = pm.CompletionSource;

			// signal the remote exception
			if (responseMessage.Error != null)
			{
				// TODO: improve exception handling
				tcs.TrySetException(new JsonServicesException(responseMessage.Error.Code, responseMessage.Error.Message));
				return;
			}

			// signal the result
			tcs.TrySetResult(responseMessage.Result);
		}

		private void HandleRequestMessage(RequestMessage msg)
		{
			// it's an event
			SubscriptionManager.BroadcastAsync(msg.Name, (EventArgs)msg.Parameters);
		}

		private Task<object> GetResultTask(string messageId)
		{
			if (PendingMessages.TryGetValue(messageId, out var msg))
			{
				return msg.CompletionSource.Task;
			}

			throw new InvalidOperationException($"Message {messageId} already handled");
		}

		internal object GetSyncResult(PendingMessage pm)
		{
			// task.Result wraps the exception in AggregateException
			// task.GetAwaiter().GetResult() does not
			return pm.CompletionSource.Task.GetAwaiter().GetResult();
		}

		internal Task GetAsyncResult(PendingMessage pm)
		{
			return pm.CompletionSource.Task;
		}

		internal async Task<TResult> GetAsyncResult<TResult>(PendingMessage pm)
		{
			var result = await pm.CompletionSource.Task;
			return (TResult)result;
		}

		private long lastMessageId;

		internal string GenerateMessageId()
		{
			var id = Interlocked.Increment(ref lastMessageId);
			return id.ToString();
		}

		internal string GetName(object request)
		{
			if (request is ICustomName customName)
			{
				return customName.MessageName;
			}

			return request.GetType().FullName;
		}

		public void Notify(object request)
		{
			if (request == null)
			{
				throw new ArgumentNullException(nameof(request));
			}

			var requestMessage = new RequestMessage
			{
				Name = GetName(request),
				Parameters = request,
			};

			#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
			SendMessage(requestMessage);
			#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
		}

		public async Task<TResponse> Call<TResponse>(IReturn<TResponse> request)
		{
			if (request == null)
			{
				throw new ArgumentNullException(nameof(request));
			}

			var requestMessage = new RequestMessage
			{
				Id = GenerateMessageId(),
				Name = GetName(request),
				Parameters = request,
			};

			var pm = await SendMessage(requestMessage);
			var result = await GetAsyncResult<TResponse>(pm);
			return result;
		}

		public async Task Call(IReturnVoid request)
		{
			if (request == null)
			{
				throw new ArgumentNullException(nameof(request));
			}

			var requestMessage = new RequestMessage
			{
				Id = GenerateMessageId(),
				Name = GetName(request),
				Parameters = request,
			};

			var pm = await SendMessage(requestMessage);
			await GetAsyncResult(pm);
		}

		private ClientSubscriptionManager SubscriptionManager { get; } = new ClientSubscriptionManager();

		public Action Subscribe<TEventArgs>(string eventName, EventHandler<TEventArgs> eventHandler, Dictionary<string, string> eventFilter)
			where TEventArgs : EventArgs
		{
			// match event name with the argument type
			Serializer.MessageTypeProvider.Register(eventName, typeof(TEventArgs));

			// prepare subscription metadata
			var subscription = new ClientSubscription<TEventArgs>
			{
				SubscriptionId = GenerateMessageId(),
				EventName = eventName,
				EventFilter = eventFilter,
				EventHandler = eventHandler,
			};

			// notify the server about the new subscription
			var subscrMessage = subscription.CreateSubscriptionMessage();
			Notify(subscrMessage);

			// register subscription in the subscription manager
			var unsubscribe = SubscriptionManager.Add(subscription);
			var unsubMessage = subscription.CreateUnsubscriptionMessage();

			// return unsubscription action
			return () =>
			{
				unsubscribe();
				Notify(unsubMessage);
			};
		}
	}
}

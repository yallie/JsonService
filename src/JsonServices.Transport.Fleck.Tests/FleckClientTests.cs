﻿using System;
using System.Threading.Tasks;
using JsonServices.Serialization.ServiceStack;
using JsonServices.Tests;
using JsonServices.Tests.Services;
using NUnit.Framework;
using WebSocketClient = JsonServices.Transport.WebSocketSharp.WebSocketClient;

namespace JsonServices.Transport.Fleck.Tests
{
	[TestFixture]
	public class FleckClientTests : JsonClientTests
	{
		[Test]
		public Task JsonClientSupportsSubscriptionsAndUnsubscriptionsUsingFleckServerAndWebSocketSharpClient() =>
			TestSubscriptionsAndUnsubscriptionsCore(url => new WebSocketClient(url));

		[Test]
		public Task JsonClientSupportsSubscriptionsAndUnsubscriptionsUsingFleckServerAndFleckClient() =>
			TestSubscriptionsAndUnsubscriptionsCore(url => new FleckClient(url));

		private async Task TestSubscriptionsAndUnsubscriptionsCore(Func<string, IClient> clientFactory)
		{
			// websocket transport
			var server = new FleckServer("ws://127.0.0.1:8787");
			var client = clientFactory("ws://127.0.0.1:8787");
			var secondClient = clientFactory("ws://127.0.0.1:8787");
			var serializer = new Serializer();
			var executor = new StubExecutor();
			var provider = new StubMessageTypeProvider();

			// json server and client
			using (var js = new JsonServer(server, provider, serializer, executor))
			using (var jc = new JsonClient(client, provider, serializer))
			using (var sc = new JsonClient(secondClient, provider, serializer))
			{
				// set names for easier debugging
				jc.DebugName = "First";
				sc.DebugName = "Second";

				// execute core test
				await TestSubscriptionsAndUnsubscriptionsCore(js, jc, sc);
			}
		}

		[Test]
		public Task JsonClientSupportsFilteredSubscriptionsAndUnsubscriptionsUsingFleckServerAndWebSocketSharpClient() =>
			TestFilteredSubscriptionsAndUnsubscriptionsCore(url => new WebSocketClient(url));

		[Test]
		public Task JsonClientSupportsFilteredSubscriptionsAndUnsubscriptionsUsingFleckServerAndFleckClient() =>
			TestFilteredSubscriptionsAndUnsubscriptionsCore(url => new FleckClient(url));

		private async Task TestFilteredSubscriptionsAndUnsubscriptionsCore(Func<string, IClient> clientFactory)
		{
			// websocket transport
			var server = new FleckServer("ws://127.0.0.1:8787");
			var client = clientFactory("ws://127.0.0.1:8787");
			var secondClient = clientFactory("ws://127.0.0.1:8787");
			var serializer = new Serializer();
			var executor = new StubExecutor();
			var provider = new StubMessageTypeProvider();

			// json server and client
			using (var js = new JsonServer(server, provider, serializer, executor))
			using (var jc = new JsonClient(client, provider, serializer))
			using (var sc = new JsonClient(secondClient, provider, serializer))
			{
				// set names for easier debugging
				jc.DebugName = "First";
				sc.DebugName = "Second";

				// execute core test
				await TestFilteredSubscriptionsAndUnsubscriptionsCore(js, jc, sc);
			}
		}
	}
}

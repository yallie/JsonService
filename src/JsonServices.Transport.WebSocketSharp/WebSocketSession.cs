﻿using System;
using JsonServices.Sessions;
using WebSocketSharp;
using WebSocketSharp.Server;
using WsMessageEventArgs = WebSocketSharp.MessageEventArgs;

namespace JsonServices.Transport.WebSocketSharp
{
	public class WebSocketSession : WebSocketBehavior, IConnection
	{
		internal const string ServiceName = "/";

		public string ConnectionId => ID.ToString();

		public Session Session { get; set; }

		public Action<WsMessageEventArgs> OnMessageHandler { get; set; }

		protected override void OnMessage(WsMessageEventArgs e)
		{
			base.OnMessage(e);
			OnMessageHandler?.Invoke(e);
		}

		public Action OnOpenHandler { get; set; }

		protected override void OnOpen()
		{
			base.OnOpen();
			OnOpenHandler?.Invoke();
		}

		public Action<CloseEventArgs> OnCloseHandler { get; set; }

		protected override void OnClose(CloseEventArgs e)
		{
			base.OnClose(e);
			OnCloseHandler?.Invoke(e);
		}
	}
}

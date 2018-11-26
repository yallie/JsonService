﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebSocketSharp;
using WebSocketSharp.Server;
using ISession = JsonServices.Transport.ISession;

namespace JsonServices.WebSocketServer
{
	public class WebSocketSession : WebSocketBehavior, ISession
	{
		internal const string ServiceName = "/Default";

		public string SessionId => ID.ToString();

		public Action<MessageEventArgs> OnMessageHandler { get; set; }

		protected override void OnMessage(MessageEventArgs e)
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

﻿using Fleck;
using JsonServices.Sessions;

namespace JsonServices.Transport.Fleck
{
	public class FleckSession : IConnection
	{
		public FleckSession(IWebSocketConnection socket)
		{
			Socket = socket;
			ConnectionId = Socket.ConnectionInfo.Id.ToString();
		}

		public IWebSocketConnection Socket { get; set; }

		public string ConnectionId { get; }

		public Session Session { get; set; }
	}
}

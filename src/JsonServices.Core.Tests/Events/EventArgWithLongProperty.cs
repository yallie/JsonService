﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace JsonServices.Tests.Events
{
	public class EventArgWithLongProperty : EventArgs
	{
		public long RecordID { get; set; }
	}
}

﻿using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace JsonServices.Auth.SecureRemotePassword.Tests
{
	[TestFixture]
	public class SrpProtocolConstantsTests
	{
		[Test]
		public void GetParameterDoesntThrowWhenParameterIsUnknown()
		{
			var authRequest = new AuthRequest();
			Assert.IsNull(authRequest.GetParameter("viscosity"));
			Assert.IsNull(authRequest.GetStepNumber());

			authRequest.Parameters[SrpProtocolConstants.StepNumberKey] = "123";
			Assert.AreEqual(123, authRequest.GetStepNumber());
		}

		[Test]
		public void CommonRequestParametersAreSupported()
		{
			var authRequest = new AuthRequest();
			var parameters = new Dictionary<string, Func<AuthRequest, object>>
			{
				{ SrpProtocolConstants.UserNameKey, SrpProtocolConstants.GetUserName },
				{ SrpProtocolConstants.LoginSessionKey, SrpProtocolConstants.GetLoginSession },
				{ SrpProtocolConstants.ClientPublicEphemeralKey, SrpProtocolConstants.GetClientPublicEphemeral },
				{ SrpProtocolConstants.ClientSessionProofKey, SrpProtocolConstants.GetClientSessionProof },
			};

			foreach (var pair in parameters)
			{
				// initial value is null
				Assert.IsNull(pair.Value(authRequest));

				// sample value is not null
				var expected = $"{pair.Key}123";
				authRequest.Parameters[pair.Key] = expected;
				Assert.IsNotNull(pair.Value(authRequest));
				Assert.AreEqual(expected, pair.Value(authRequest));
			}
		}

		[Test]
		public void CommonResponseParametersAreSupported()
		{
			var authResponse = new AuthResponse();
			var parameters = new Dictionary<string, Func<AuthResponse, object>>
			{
				{ SrpProtocolConstants.SaltKey, SrpProtocolConstants.GetSalt },
				{ SrpProtocolConstants.ServerPublicEphemeralKey, SrpProtocolConstants.GetServerPublicEphemeral },
				{ SrpProtocolConstants.ServerSessionProofKey, SrpProtocolConstants.GetServerSessionProof },
			};

			foreach (var pair in parameters)
			{
				// initial value is null
				Assert.IsNull(pair.Value(authResponse));

				// sample value is not null
				var expected = $"{pair.Key}123";
				authResponse.Parameters[pair.Key] = expected;
				Assert.IsNotNull(pair.Value(authResponse));
				Assert.AreEqual(expected, pair.Value(authResponse));
			}
		}
	}
}

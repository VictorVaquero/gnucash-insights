import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  RespondToAuthChallengeCommandInput,
  SignUpCommand,
  type InitiateAuthCommandInput
} from "@aws-sdk/client-cognito-identity-provider";

import config from "../config.json";


export const cognitoClient = new CognitoIdentityProviderClient({
  region: config.region,
});


export const signInAws = async (username: string, password: string) => {
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };
  try {

    const command = new InitiateAuthCommand(params as InitiateAuthCommandInput);
    const result = await cognitoClient.send(command);
    let AuthenticationResult = result.AuthenticationResult;

    console.debug("AWS Try send auth command with result: ", result);
    if (result.ChallengeName) {
      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED' && result.Session) {
        console.debug("Needs to confirm password, just send the same back.");
        const challengeResult = await newPwdRequired(username, password, result.Session)
        AuthenticationResult = challengeResult.AuthenticationResult;
      }
      else {
        console.debug(`Challenge ${result.ChallengeName} not yet supported.`)
        throw Error('Challenge not yet supported')
      }
    }
    if (AuthenticationResult) {
      console.debug("AWS Got Auth result");
      //setAuthResult(username, AuthenticationResult)
      return AuthenticationResult;
    }
    throw Error('No authentication result');
  } catch (error) {
    console.error("Error signing in: ", error);
    throw error;
  }
};

const newPwdRequired = async (username: string, password: string, session: string) => {
  console.debug("AWS Challenge: Update pwd");
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: config.clientId,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: password
    },
    Session: session
  };

  try {
    const command = new RespondToAuthChallengeCommand(params as RespondToAuthChallengeCommandInput);
    const result = await cognitoClient.send(command);
    return result;
  }
  catch (error) {
    console.error('Failure to respond to challenge', error)
    throw error
  }
}



export const signUp = async (email: string, password: string) => {
  const params = {
    ClientId: config.clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  };
  try {
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    console.log("Sign up success: ", response);
    return response;
  } catch (error) {
    console.error("Error signing up: ", error);
    throw error;
  }
};

export const confirmSignUp = async (username: string, code: string) => {
  const params = {
    ClientId: config.clientId,
    Username: username,
    ConfirmationCode: code,
  };
  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    console.log("User confirmed successfully");
    return true;
  } catch (error) {
    console.error("Error confirming sign up: ", error);
    throw error;
  }
};

export const refreshTokenAws = async (refreshToken: string | undefined) => {
  console.debug("AWS Refresh token");
  //const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No token to refresh.')
  }

  const initiateAuthParams = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: config.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

  try {
    const command = new InitiateAuthCommand(initiateAuthParams as InitiateAuthCommandInput)
    const result = await cognitoClient.send(command);
    if (result.ChallengeName || !result.AuthenticationResult) {
      console.debug(`Challenge ${result.ChallengeName} not yet supported.`)
      throw Error('Challenge not yet supported')
    }
    return result.AuthenticationResult;
    //setAuthResult(getUser(), result.AuthenticationResult!)
  }
  catch (error) {
    console.error("Error refreshing token: ", error);
    throw error;
  }
}

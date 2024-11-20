import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type InitiateAuthCommandInput,
  SignUpCommand,
  ConfirmSignUpCommand,
  RespondToAuthChallengeCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import config from "../config.json";


export const getAccessToken = (): string => {
  return sessionStorage.getItem('accessToken') as string;
}

export const getIdToken = (): string => {
  return sessionStorage.getItem('idToken') as string;
}

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
}

export const cognitoClient = new CognitoIdentityProviderClient({
  region: config.region,
});

export const signIn = async (username: string, password: string) => {
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
    let { AuthenticationResult, ChallengeName, Session} = await cognitoClient.send(command);
    console.debug("Try send auth command", AuthenticationResult, ChallengeName);
    if (ChallengeName === 'NEW_PASSWORD_REQUIRED'){
        console.debug("Needs to confirm password, just send the same back.");
        const params = {
          AuthFlow: "USER_PASSWORD_AUTH",
          ChallengeName: 'NEW_PASSWORD_REQUIRED', 
          ClientId: config.clientId,
          ChallengeResponses: {
            USERNAME: username ,
            NEW_PASSWORD: password 
          },
          Session: Session
        };
        const command = new RespondToAuthChallengeCommand(params as RespondToAuthChallengeCommandInput);
        const result = await cognitoClient.send(command);
        AuthenticationResult = result.AuthenticationResult;
        ChallengeName = result.ChallengeName;
        Session = result.Session;
    }
    if (AuthenticationResult) {
      console.debug("Go auth result");
      sessionStorage.setItem("idToken", AuthenticationResult.IdToken || "");
      sessionStorage.setItem(
        "accessToken",
        AuthenticationResult.AccessToken || "",
      );
      sessionStorage.setItem(
        "refreshToken",
        AuthenticationResult.RefreshToken || "",
      );
      return AuthenticationResult;
    }
  } catch (error) {
    console.error("Error signing in: ", error);
    throw error;
  }
};

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

export const refreshToken = async()=> {
  
  const  refreshToken =  sessionStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('No token to refresh.')
  }
  console.log("This is the refreshToken in the cooki: ", refreshToken);

  const initiateAuthParams = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: config.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

    const response = await cognitoClient.send(new InitiateAuthCommand(initiateAuthParams as InitiateAuthCommandInput));
    console.log("This is the access token:", response.AuthenticationResult?.AccessToken);
      sessionStorage.setItem("idToken", response.AuthenticationResult?.IdToken || "");
      sessionStorage.setItem(
        "accessToken",
        response.AuthenticationResult?.AccessToken || "",
      );
      sessionStorage.setItem(
        "refreshToken",
        response.AuthenticationResult?.RefreshToken || "",
      );

}
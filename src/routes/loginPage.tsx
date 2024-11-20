import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../services/authService";

const LoginPage = () => {
  const [user, setUser] = useState("");
  const [email, ] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, _] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      const session = await signIn(user, password);
      console.log("Sign in successful", session);
      if (session && typeof session.AccessToken !== "undefined") {
        sessionStorage.setItem("accessToken", session.AccessToken);
        if (sessionStorage.getItem("accessToken")) {
          window.location.href = "/home";
        } else {
          console.error("Session token was not set properly.");
        }
      } else {
        console.error("SignIn session or AccessToken is undefined.");
      }
    } catch (error) {
      alert(`Sign in failed: ${error}`);
    }
  };

  const handleSignUp = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      await signUp(email, password);
      navigate("/confirm", { state: { email } });
    } catch (error) {
      alert(`Sign up failed: ${error}`);
    }
  };

  return (
    <div className="loginForm text-white p-6 pt-2.5 bg-shark-800 rounded">
      <h1 className='p-4'>Welcome</h1>
      <form className='py-2' onSubmit={isSignUp ? handleSignUp : handleSignIn}>
        <div>
          <input
            className="inputText bg-shark-600 text-white pl-1"
            id="user"
            type="user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <div>
          <input
            className="inputText bg-shark-600 text-white pl-1"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        {isSignUp && (
          <div>
            <input
              className="inputText"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
            />
          </div>
        )}
        <button className="pt-4" type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
      </form>
    </div>
  );
};

export default LoginPage;
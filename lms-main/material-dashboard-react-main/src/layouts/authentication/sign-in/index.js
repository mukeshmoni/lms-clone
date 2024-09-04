import React, { useState } from 'react';
import { useAuth } from 'context/AuthContext';
// Path to your context

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Replace with your authentication logic (e.g., API call)
    const response = await fakeAuth(email, password);
    if (response.success) {
      login();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
};

// Simulate an authentication API call
const fakeAuth = (email, password) => new Promise((resolve) => {
  setTimeout(() => resolve({ success: email === 'asd' && password === 'asd' }), 1000);
});

export default Login;

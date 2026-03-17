// LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login(data);
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', background: '#FAFAF9' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: '#C0152A', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <span style={{ transform: 'rotate(45deg)', color: '#fff', fontSize: 22, fontWeight: 700 }}>+</span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#1A1A18' }}>LifeDrop</h1>
        <p style={{ fontSize: 14, color: '#6B6860', marginTop: 4 }}>Emergency Blood Donor Network</p>
      </div>

      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF', padding: '28px 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Sign in</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label style={labelStyle}>Phone number</label>
          <input {...register('phone', { required: 'Phone is required' })} placeholder="+91-9876543210" style={inputStyle} />
          {errors.phone && <p style={errStyle}>{errors.phone.message}</p>}

          <label style={labelStyle}>Password</label>
          <input {...register('password', { required: 'Password is required' })} type="password" placeholder="••••••••" style={inputStyle} />
          {errors.password && <p style={errStyle}>{errors.password.message}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#6B6860', marginTop: 16 }}>
          No account? <Link to="/register" style={{ color: '#C0152A', fontWeight: 500 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: '#6B6860', marginBottom: 4, marginTop: 12 };
const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #E8E4DF', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const errStyle  = { fontSize: 12, color: '#C0152A', marginTop: 2 };
const btnStyle  = { width: '100%', padding: '12px', background: '#C0152A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 20 };

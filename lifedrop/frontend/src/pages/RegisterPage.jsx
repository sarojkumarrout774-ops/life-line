import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import { useGeolocation } from '../hooks/useGeolocation';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [selectedBG, setSelectedBG] = useState('');
  const { setAuth } = useAuthStore();
  const { location, getLocation } = useGeolocation();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    if (!selectedBG) return toast.error('Please select your blood group');
    setLoading(true);
    try {
      const payload = { ...data, blood_group: selectedBG, lat: location?.lat, lng: location?.lng };
      const res = await authAPI.register(payload);
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome to LifeDrop! 🩸');
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px', background: '#FAFAF9' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1A1A18' }}>Join LifeDrop</h1>
          <p style={{ fontSize: 13, color: '#6B6860', marginTop: 4 }}>Save lives as a donor or find help as a receiver</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E4DF', padding: '24px 20px' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Label>Full name</Label>
            <Input {...register('name', { required: 'Name is required' })} placeholder="Arjun Reddy" />
            <Err msg={errors.name?.message} />

            <Label>Phone number</Label>
            <Input {...register('phone', { required: 'Phone is required' })} placeholder="+91-9876543210" />
            <Err msg={errors.phone?.message} />

            <Label>Email (optional)</Label>
            <Input {...register('email')} placeholder="email@example.com" type="email" />

            <Label>Password</Label>
            <Input {...register('password', { required: true, minLength: { value: 6, message: 'Min 6 characters' } })} type="password" placeholder="••••••••" />
            <Err msg={errors.password?.message} />

            <Label>I want to</Label>
            <select {...register('role', { required: true })} style={inputStyle}>
              <option value="donor">Donate blood</option>
              <option value="receiver">Request blood</option>
              <option value="both">Both donate and request</option>
            </select>

            <Label>Blood group</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 12px' }}>
              {BLOOD_GROUPS.map(bg => (
                <button key={bg} type="button" onClick={() => setSelectedBG(bg)} style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid',
                  borderColor: selectedBG === bg ? '#C0152A' : '#E8E4DF',
                  background: selectedBG === bg ? '#C0152A' : '#fff',
                  color: selectedBG === bg ? '#fff' : '#1A1A18',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>{bg}</button>
              ))}
            </div>

            <Label>City</Label>
            <Input {...register('city')} placeholder="Hyderabad" />

            <button type="button" onClick={getLocation} style={{
              width: '100%', padding: '9px', background: '#FFF0F1',
              color: '#C0152A', border: '1px solid #F7C1C1',
              borderRadius: 10, fontSize: 13, cursor: 'pointer', marginBottom: 10,
            }}>
              📍 {location ? `Location detected (${location.lat.toFixed(3)}, ${location.lng.toFixed(3)})` : 'Detect my location'}
            </button>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 12, background: '#C0152A', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#6B6860', marginTop: 14 }}>
            Already registered? <Link to="/login" style={{ color: '#C0152A', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #E8E4DF', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 2 };
const Label = ({ children }) => <label style={{ display: 'block', fontSize: 12, color: '#6B6860', marginBottom: 4, marginTop: 12 }}>{children}</label>;
const Input = React.forwardRef((props, ref) => <input ref={ref} style={inputStyle} {...props} />);
const Err = ({ msg }) => msg ? <p style={{ fontSize: 12, color: '#C0152A', marginTop: 2, marginBottom: 4 }}>{msg}</p> : null;

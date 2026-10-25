'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

type View = 'home' | 'login' | 'user-dashboard' | 'admin-login' | 'admin-dashboard';
type Issue = {
  id: string;
  user_id?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  description: string | null;
  status: string;
  created_at: string;
};

// Demo-only gate for the Congressional App Challenge recording.
// This client-side password is not secure enough for a real production admin portal.
const DEMO_ADMIN_PASSWORD = 'civic-demo-2026';

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [customStatusInput, setCustomStatusInput] = useState<Record<string, string>>({});
  const [isCustomMode, setIsCustomMode] = useState<Record<string, boolean>>({});

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);

  useEffect(() => {
    if (view === 'user-dashboard') void fetchUserIssues();
    if (view === 'admin-dashboard') void fetchAllIssues();
    // These fetches intentionally run when the selected view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const fetchUserIssues = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load your reports: ${error.message}`);
      return;
    }
    if (data) setMyIssues(data as Issue[]);
  };

  const fetchAllIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load reports: ${error.message}`);
      return;
    }
    if (data) setAllIssues(data as Issue[]);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      alert('Please fill in your email and password.');
      return;
    }

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) alert(error.message);
      else {
        alert('Account created! You can now log in.');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) alert(error.message);
      else {
        setStatus('');
        setView('user-dashboard');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('home');
    setImageFile(null);
    setImagePreview(null);
    setLocation(null);
    setDescription('');
    setStatus('');
  };

  const requestLocation = () => {
    setLocation(null);
    setIsGettingLocation(true);
    setStatus('Getting location...');

    if (!('geolocation' in navigator)) {
      setIsGettingLocation(false);
      setStatus('Location is not supported by this browser. Try the latest version of Chrome.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
        setStatus('Location locked. Ready to submit.');
      },
      (error) => {
        setIsGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('Location permission denied. Allow location access for this website in your browser settings, then try again.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus('Your location is unavailable. Check your device location settings and try again.');
        } else if (error.code === error.TIMEOUT) {
          setStatus('Location timed out after 10 seconds. Try again or check browser location permissions.');
        } else {
          setStatus('Could not get your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    requestLocation();
  };

  const handleSubmitIssue = async () => {
    if (!imageFile) {
      setStatus('Please select a photo before submitting.');
      return;
    }
    if (!location) {
      setStatus('Please wait for your location or use Get Location to try again.');
      return;
    }
    if (!description.trim()) {
      setStatus('Please enter a description of the issue.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Uploading report...');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setStatus('Please sign in before submitting a report.');
        setView('login');
        return;
      }

      const fileExt = imageFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('issue-images')
        .upload(fileName, imageFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('issue-images')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('issues').insert([{
        user_id: user.id,
        image_url: urlData.publicUrl,
        lat: location.lat,
        lng: location.lng,
        description: description.trim(),
        status: 'Pending',
      }]);

      if (dbError) throw dbError;

      setStatus('Submitted successfully!');
      setImageFile(null);
      setImagePreview(null);
      setLocation(null);
      setDescription('');
      setIsGettingLocation(false);
      await fetchUserIssues();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setStatus(`Error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateIssueStatus = async (id: string, newStatus: string) => {
    const previousIssues = allIssues;
    setAllIssues((items) => items.map((issue) => issue.id === id ? { ...issue, status: newStatus } : issue));

    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      setAllIssues(previousIssues);
      alert(`Database update failed: ${error.message}`);
    }
  };

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (adminPassword === DEMO_ADMIN_PASSWORD) {
      setAdminError('');
      setAdminPassword('');
      setStatus('');
      setView('admin-dashboard');
    } else {
      setAdminError('Incorrect demo password. Please try again.');
    }
  };

  if (view === 'home') {
    return (
      <main style={{ maxWidth: 700, margin: '40px auto', padding: 30, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 36, color: '#0f172a', marginBottom: 10 }}>CivicIssue Reporter</h1>
        <p style={{ fontSize: 18, color: '#475569' }}>
          Empowering neighborhoods to report infrastructure issues directly to local authorities with location details and photo evidence.
        </p>
        <div style={{ display: 'flex', gap: 15, marginTop: 30, flexWrap: 'wrap' }}>
          <button onClick={() => setView('login')} style={primaryButton}>Citizen Portal / Login</button>
          <button onClick={() => { setAdminError(''); setView('admin-login'); }} style={secondaryButton}>Admin Portal (Demo)</button>
        </div>
        <div style={{ marginTop: 50, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
          <h3>For City Administrators</h3>
          <p style={{ color: '#64748b' }}>
            Interested in integrating this platform with municipal workflows? This prototype demonstrates a way to organize community reports and track their status.
          </p>
        </div>
      </main>
    );
  }

  if (view === 'login') {
    return (
      <main style={{ maxWidth: 400, margin: '60px auto', padding: 30, fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>{isRegistering ? 'Register' : 'Login'}</h2>
          <button onClick={() => setView('home')} style={textButton}>Home</button>
        </div>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          <button type="submit" style={primaryButton}>{isRegistering ? 'Create Account' : 'Sign In'}</button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ ...textButton, color: '#0284c7' }}>
            {isRegistering ? 'Login' : 'Register'}
          </button>
        </p>
      </main>
    );
  }

  if (view === 'admin-login') {
    return (
      <main style={{ maxWidth: 400, margin: '60px auto', padding: 30, fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Admin Demo Login</h2>
          <button onClick={() => setView('home')} style={textButton}>Home</button>
        </div>
        <p style={{ color: '#64748b', fontSize: 14 }}>Enter the demo password to open the administrator view.</p>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input type="password" autoComplete="off" placeholder="Demo password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required style={inputStyle} />
          {adminError && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{adminError}</p>}
          <button type="submit" style={primaryButton}>Open Admin Portal</button>
        </form>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 18 }}>Demo access only. This client-side gate is not production security.</p>
      </main>
    );
  }

  if (view === 'admin-dashboard') {
    const predefinedStatuses = ['Pending', 'In Progress', 'Resolved'];
    return (
      <main style={{ maxWidth: 800, margin: '30px auto', padding: 20, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Admin Portal</h1>
          <button onClick={() => { setView('home'); setStatus(''); }} style={secondaryButton}>Home / Exit</button>
        </div>
        <p style={{ color: '#64748b' }}>Review submitted reports and update their statuses.</p>
        {status && <p role="status" style={{ color: '#b45309' }}>{status}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
          {allIssues.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>No reports found in database.</p>
          ) : allIssues.map((item) => {
            const isPredefined = predefinedStatuses.includes(item.status);
            const inCustomMode = isCustomMode[item.id] ?? !isPredefined;
            return (
              <article key={item.id} style={{ display: 'flex', gap: 20, border: '1px solid #cbd5e1', padding: 15, borderRadius: 8, background: '#fff', flexWrap: 'wrap' }}>
                {item.image_url ? <img src={item.image_url} alt="Reported issue" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 120, height: 120, display: 'grid', placeItems: 'center', background: '#f1f5f9', color: '#64748b', borderRadius: 6, fontSize: 13 }}>No image</div>}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ margin: '0 0 5px', fontSize: 14, color: '#64748b' }}>📍 {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</p>
                  <p style={{ margin: '0 0 10px', fontWeight: 500 }}>{item.description || 'No description provided.'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>Status:</span>
                    {!inCustomMode ? (
                      <select value={item.status} onChange={(e) => {
                        if (e.target.value === 'CUSTOM_OPTION') {
                          setIsCustomMode((prev) => ({ ...prev, [item.id]: true }));
                          setCustomStatusInput((prev) => ({ ...prev, [item.id]: item.status }));
                        } else void updateIssueStatus(item.id, e.target.value);
                      }} style={inputStyle}>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        {!isPredefined && <option value={item.status}>{item.status}</option>}
                        <option value="CUSTOM_OPTION">-- Write in custom status... --</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="text" placeholder="Enter custom status..." value={customStatusInput[item.id] ?? item.status} onChange={(e) => setCustomStatusInput((prev) => ({ ...prev, [item.id]: e.target.value }))} style={{ ...inputStyle, width: 190 }} />
                        <button onClick={() => {
                          const nextStatus = customStatusInput[item.id]?.trim() || item.status;
                          void updateIssueStatus(item.id, nextStatus);
                          setIsCustomMode((prev) => ({ ...prev, [item.id]: false }));
                        }} style={primaryButton}>Save</button>
                        <button onClick={() => setIsCustomMode((prev) => ({ ...prev, [item.id]: false }))} style={secondaryButton}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: '30px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Report an Issue</h1>
        <button onClick={() => void handleLogout()} style={dangerButton}>Logout</button>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 15, background: '#fff', padding: 20, border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div>
          <label htmlFor="issue-photo" style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Snap Photo:</label>
          <input id="issue-photo" type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ cursor: 'pointer' }} />
        </div>
        {imagePreview && <img src={imagePreview} alt="Selected report preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6 }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={requestLocation} disabled={isGettingLocation} style={secondaryButton}>
            {isGettingLocation ? 'Getting Location...' : location ? 'Refresh Location' : 'Get Location'}
          </button>
          {location && <span style={{ fontSize: 13, color: '#059669' }}>📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
        </div>
        <div>
          <label htmlFor="issue-description" style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Description:</label>
          <input id="issue-description" type="text" placeholder="e.g., Broken streetlight on 4th Ave" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
        </div>
        <button onClick={() => void handleSubmitIssue()} disabled={isSubmitting || isGettingLocation} style={{ ...primaryButton, opacity: isSubmitting || isGettingLocation ? 0.65 : 1 }}>
          {isSubmitting ? 'Submitting...' : 'Submit to City'}
        </button>
        {status && <p role="status" style={{ fontWeight: 'bold', color: status.startsWith('Error:') || status.toLowerCase().includes('denied') || status.toLowerCase().includes('timed out') ? '#b91c1c' : '#0284c7', textAlign: 'center', margin: 0 }}>{status}</p>}
      </section>

      <section style={{ marginTop: 30 }}>
        <h3>Your Submitted Reports</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {myIssues.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>You haven't submitted any reports yet.</p>
          ) : myIssues.map((issue) => (
            <article key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontWeight: 'bold', fontSize: 14 }}>{issue.description || 'Civic Report'}</p>
                <span style={{ fontSize: 12, color: '#64748b' }}>Submitted: {new Date(issue.created_at).toLocaleDateString()}</span>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 'bold', background: issue.status === 'Resolved' ? '#dcfce7' : issue.status === 'In Progress' ? '#e0f2fe' : '#fef9c3', color: issue.status === 'Resolved' ? '#166534' : issue.status === 'In Progress' ? '#0369a1' : '#854d0e' }}>{issue.status}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const primaryButton: React.CSSProperties = {
  padding: '12px 18px', background: '#0284c7', color: '#fff', border: 'none',
  borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 15,
};
const secondaryButton: React.CSSProperties = {
  padding: '9px 14px', background: '#334155', color: '#fff', border: 'none',
  borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 14,
};
const dangerButton: React.CSSProperties = {
  padding: '8px 12px', background: '#ef4444', color: '#fff', border: 'none',
  borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
};
const textButton: React.CSSProperties = {
  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
  textDecoration: 'underline', fontSize: 14,
};
const inputStyle: React.CSSProperties = {
  padding: '9px 10px', fontSize: 14, borderRadius: 6,
  border: '1px solid #cbd5e1', boxSizing: 'border-box',
};

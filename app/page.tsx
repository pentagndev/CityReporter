\'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

const DEMO_ADMIN_PASSWORD = 'civic-demo-2026';

export default function Home() {
  const [view, setView] = useState<'home' | 'login' | 'admin-login' | 'user-dashboard' | 'admin-dashboard'>('home');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [customStatusInput, setCustomStatusInput] = useState<{ [key: string]: string }>({});
  const [isCustomMode, setIsCustomMode] = useState<{ [key: string]: boolean }>({});

  // User Dashboard States
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  
  // Tracking & Admin Feed Data
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);

  useEffect(() => {
    if (view === 'user-dashboard') fetchUserIssues();
    if (view === 'admin-dashboard') fetchAllIssues();
  }, [view]);

  const fetchUserIssues = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setMyIssues(data);
  };

  const fetchAllIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setAllIssues(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else {
        alert('Account created! You can now log in.');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else setView('user-dashboard');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('home');
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus('Getting location...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStatus('Location locked. Ready to submit.');
        },
        () => setStatus('Failed to get location'),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSubmitIssue = async () => {
    if (!imageFile || !location) {
      alert('Please include an image and location.');
      return;
    }

    setStatus('Uploading report...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setView('login');
        return;
      }

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('issue-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('issue-images')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('issues').insert([
        {
          user_id: user.id,
          image_url: urlData.publicUrl,
          lat: location.lat,
          lng: location.lng,
          description,
          status: 'Pending',
        },
      ]);

      if (dbError) throw dbError;

      setStatus('Submitted successfully!');
      setImageFile(null);
      setImagePreview(null);
      setLocation(null);
      setDescription('');
      fetchUserIssues();
    } catch (err: any) {
      setStatus('Error: ' + err.message);
    }
  };

  const updateIssueStatus = async (id: string, newStatus: string) => {
    // 1. Instantly update UI 
    setAllIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === id ? { ...issue, status: newStatus } : issue
      )
    );

    // 2. Persist to Supabase DB
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Database update failed: ${error.message}`);
      fetchAllIssues(); // Rollback UI if DB update failed
    }
  };

  // 1. LANDING PAGE VIEW
  if (view === 'home') {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '30px', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '36px', color: '#0f172a', marginBottom: '10px' }}>CivicIssue Reporter</h1>
        <p style={{ fontSize: '18px', color: '#475569' }}>
          Empowering neighborhoods to report infrastructure issues directly to local authorities with precise geotagging and photo evidence.
        </p>

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button 
            onClick={() => setView('login')}
            style={{ padding: '12px 24px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
          >
            Citizen Portal / Login
          </button>
          <button 
            onClick={() => { setAdminPassword(''); setAdminError(''); setView('admin-login'); }}
            style={{ padding: '12px 24px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
          >
            Admin Portal (Demo)
          </button>
        </div>

        <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h3>For City Administrators</h3>
          <p style={{ color: '#64748b' }}>
            Looking to integrate this platform with your municipal workflows or municipal database? Reach out to our technical team at{' '}
            <a href="mailto:example@testemail.com" style={{ color: '#0284c7' }}>example@testemail.com</a>.
          </p>
        </div>
      </div>
    );
  }

  // 2. LOGIN / REGISTER VIEW
  if (view === 'login') {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{isRegistering ? 'Register' : 'Login'}</h2>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}>Home</button>
        </div>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'text' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'text' }}
          />
          <button type="submit" style={{ padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button" 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isRegistering ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    );
  }

  // 3. DEMO ADMIN PASSWORD VIEW
  if (view === 'admin-login') {
    const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword === DEMO_ADMIN_PASSWORD) {
        setAdminError('');
        setAdminPassword('');
        setView('admin-dashboard');
      } else {
        setAdminError('Incorrect demo password. Please try again.');
      }
    };

    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Admin Demo Login</h2>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}>Home</button>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Enter the demo password to open the administrator dashboard.</p>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            placeholder="Demo admin password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="off"
            required
            style={{ padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button type="submit" style={{ padding: '10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Open Admin Portal
          </button>
        </form>
        {adminError && <p role="alert" style={{ marginTop: '15px', color: '#dc2626', fontSize: '14px' }}>{adminError}</p>}
        <p style={{ marginTop: '20px', color: '#94a3b8', fontSize: '12px' }}>Demo-only password gate. This is not real authentication.</p>
      </div>
    );
  }

  // 4. ADMIN PORTAL VIEW
  if (view === 'admin-dashboard') {
    const predefinedStatuses = ['Pending', 'In Progress', 'Resolved'];

    return (
      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', display: 'inline-block' }}>Admin Portal</h1>
          <button 
            onClick={() => setView('home')} 
            style={{ padding: '8px 14px', cursor: 'pointer', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', flexShrink: 0, marginLeft: '10px' }}
          >
            Home / Exit
          </button>
        </div>
        <p style={{ color: '#64748b' }}>Live municipal feed. Review reports and update status flags.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {allIssues.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>No reports found in database.</p>
          ) : (
            allIssues.map((item) => {
              const isPredefined = predefinedStatuses.includes(item.status);
              const inCustomMode = isCustomMode[item.id] || (!isPredefined && isCustomMode[item.id] !== false);

              return (
                <div key={item.id} style={{ display: 'flex', gap: '20px', border: '1px solid #cbd5e1', padding: '15px', borderRadius: '8px', background: '#fff' }}>
                  <img src={item.image_url} alt="Issue" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>📍 {item.lat.toFixed(4)}, {item.lng.toFixed(4)}</p>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>{item.description || 'No description provided.'}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Status:</span>
                      
                      {!inCustomMode ? (
                        <select 
                          value={item.status} 
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM_OPTION') {
                              setIsCustomMode((prev) => ({ ...prev, [item.id]: true }));
                              setCustomStatusInput((prev) => ({ ...prev, [item.id]: item.status }));
                            } else {
                              updateIssueStatus(item.id, e.target.value);
                            }
                          }}
                          style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          {!isPredefined && <option value={item.status}>{item.status}</option>}
                          <option value="CUSTOM_OPTION">-- Write in custom status... --</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Enter custom status..."
                            value={customStatusInput[item.id] !== undefined ? customStatusInput[item.id] : item.status}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomStatusInput((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                          <button 
                            onClick={() => {
                              const newStatus = customStatusInput[item.id]?.trim() || item.status;
                              updateIssueStatus(item.id, newStatus);
                              setIsCustomMode((prev) => ({ ...prev, [item.id]: false }));
                            }}
                            style={{ padding: '5px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setIsCustomMode((prev) => ({ ...prev, [item.id]: false }))}
                            style={{ padding: '5px 8px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 5. USER DASHBOARD & TRACKING VIEW
  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', display: 'inline-block' }}>Report an Issue</h1>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 12px', cursor: 'pointer', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', flexShrink: 0, marginLeft: '10px' }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#fff', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Snap Photo:</label>
          <input type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ cursor: 'pointer' }} />
        </div>

        {imagePreview && (
          <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px' }} />
        )}

        {location && <p style={{ fontSize: '14px', color: '#059669', margin: 0 }}>📍 Coordinates locked: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description:</label>
          <input 
            type="text" 
            placeholder="e.g., Broken streetlight on 4th Ave" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '10px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'text' }}
          />
        </div>

        <button 
          onClick={handleSubmitIssue}
          style={{ padding: '12px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px' }}
        >
          Submit to City
        </button>

        <p style={{ fontWeight: 'bold', color: '#0284c7', textAlign: 'center', margin: 0 }}>{status}</p>
      </div>

      {/* TRACKING SECTION */}
      <div style={{ marginTop: '30px' }}>
        <h3>Your Submitted Reports</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {myIssues.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>You haven't submitted any reports yet.</p>
          ) : (
            myIssues.map((issue) => (
              <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                <div>
                  <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px' }}>{issue.description || 'Civic Report'}</p>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Submitted: {new Date(issue.created_at).toLocaleDateString()}</span>
                </div>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '4px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  background: issue.status === 'Resolved' ? '#dcfce7' : issue.status === 'In Progress' ? '#e0f2fe' : '#fef9c3',
                  color: issue.status === 'Resolved' ? '#166534' : issue.status === 'In Progress' ? '#0369a1' : '#854d0e'
                }}>
                  {issue.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
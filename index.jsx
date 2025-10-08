import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, Timestamp, query } from 'firebase/firestore';

// --- Utility Functions and Icons (Unchanged) ---

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const isOverdue = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return false;
  const now = new Date();
  const followUpDate = timestamp.toDate();
  return followUpDate < now;
};

// Icon components (Lucide-react style inline SVG)
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M2 3h20"></path><line x1="10" y1="2" x2="14" y2="2"></line></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const ExternalLinkIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const ClockIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const ChartIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const LogOutIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const SparkleIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18.5l-3.23 1.7 0.62-3.61-2.62-2.56 3.63-0.52 1.6-3.29 1.6 3.29 3.63 0.52-2.62 2.56 0.62 3.61zM18 6l-1.39 0.72-0.57 1.39-0.57-1.39L14 6l1.39-0.72L16 3.89l0.57 1.39zM5 3l-1.39 0.72-0.57 1.39-0.57-1.39L1 3l1.39-0.72L3 0.89l0.57 1.39z"/></svg>;


// --- Firebase Setup and Custom Hook (Unchanged) ---

const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

      if (!firebaseConfig || !Object.keys(firebaseConfig).length) {
        console.error("Firebase configuration is missing.");
        setLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else if (initialAuthToken) {
           // Attempt to sign in with the Canvas-provided token if no user is signed in
           try {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
           } catch (error) {
              console.error("Custom token sign in failed:", error);
           }
        } else {
          setUserId(null); // User must sign in with email/password
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setLoading(false);
    }
  }, [initialAuthToken]);

  // Public authentication methods
  const handleSignUp = useCallback(async (email, password) => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will update the state
      return { success: true };
    } catch (error) {
      console.error("Sign up failed:", error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  }, [auth]);

  const handleSignIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will update the state
      return { success: true };
    } catch (error) {
      console.error("Sign in failed:", error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  }, [auth]);

  const handleSignOut = useCallback(async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUserId(null); // Explicitly clear state
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  return { db, auth, userId, loading, handleSignUp, handleSignIn, handleSignOut };
};


// --- Authentication Modal Component (Unchanged) ---

const AuthModal = ({ handleSignUp, handleSignIn, error, isLoading }) => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (error) {
      setAuthError(error);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    let result;
    if (isSignIn) {
      result = await handleSignIn(email, password);
    } else {
      result = await handleSignUp(email, password);
    }

    if (!result.success) {
      // Clean up Firebase error messages for better UI display
      const msg = result.error.replace('Firebase: ', '').replace(/\(auth.*\)\./, '');
      setAuthError(msg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-600">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
          {isSignIn ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-8">
          Sign in to access your saved job applications from any device.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              placeholder="••••••••"
            />
          </div>

          {authError && (
            <div className="p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-300">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 transform hover:scale-[1.01]"
          >
            {isLoading ? 'Processing...' : (isSignIn ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignIn(prev => !prev);
              setAuthError('');
              setEmail('');
              setPassword('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
          >
            {isSignIn ? 'Need an account? Sign up here.' : 'Already have an account? Sign in.'}
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main Application Component (Updated with LLM Logic) ---

const initialJobState = {
  id: null,
  title: '',
  company: '',
  link: '',
  status: 'Applied',
  dateApplied: new Date().toISOString().substring(0, 10), // YYYY-MM-DD format
  followUpDate: '',
  notes: '',
};

const STATUSES = ['Applied', 'Interviewing', 'Technical Screen', 'Offer', 'Rejected', 'On Hold'];


const App = () => {
  const { db, userId, loading, handleSignUp, handleSignIn, handleSignOut } = useFirebase();
  const [jobs, setJobs] = useState([]);
  const [jobData, setJobData] = useState(initialJobState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Firestore Data Listener (Unchanged)
  useEffect(() => {
    if (!db || !userId) return;

    // Data is stored privately for the authenticated user
    const collectionPath = `/artifacts/${appId}/users/${userId}/job_applications`;
    const jobsCollectionRef = collection(db, collectionPath);

    // Using an empty query and sorting in memory as recommended
    const q = query(jobsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory by application date, newest first
      jobList.sort((a, b) => {
        const dateA = a.dateApplied?.toDate ? a.dateApplied.toDate().getTime() : 0;
        const dateB = b.dateApplied?.toDate ? b.dateApplied.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setJobs(jobList);
    }, (error) => {
      console.error("Error fetching jobs:", error);
    });

    return () => unsubscribe();
  }, [db, userId, appId]);


  // --- CRUD Operations (Unchanged) ---

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;

    const { id, title, company, link, status, dateApplied, followUpDate, notes } = jobData;

    // Convert date strings to Firebase Timestamps
    const applicationTimestamp = dateApplied ? Timestamp.fromDate(new Date(dateApplied)) : null;
    const followUpTimestamp = followUpDate ? Timestamp.fromDate(new Date(followUpDate)) : null;

    const jobPayload = {
      title,
      company,
      link,
      status,
      dateApplied: applicationTimestamp,
      followUpDate: followUpTimestamp,
      notes,
    };

    const collectionPath = `/artifacts/${appId}/users/${userId}/job_applications`;

    try {
      if (isEditing && id) {
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, jobPayload);
      } else {
        const newDocRef = doc(collection(db, collectionPath));
        await setDoc(newDocRef, jobPayload);
      }

      handleCloseModal();
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!db || !userId) return;

    // Custom modal for confirmation (simple window.confirm fallback for brevity)
    if (window.confirm("Are you sure you want to delete this job application?")) {
      try {
        const docRef = doc(db, `/artifacts/${appId}/users/${userId}/job_applications`, id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Error deleting job:", error);
      }
    }
  };

  // --- UI Handlers (Unchanged) ---

  const handleOpenModal = (job = null) => {
    if (job) {
      const formattedJob = {
        ...job,
        dateApplied: job.dateApplied?.toDate ? job.dateApplied.toDate().toISOString().substring(0, 10) : initialJobState.dateApplied,
        followUpDate: job.followUpDate?.toDate ? job.followUpDate.toDate().toISOString().substring(0, 10) : '',
      };
      setJobData(formattedJob);
      setIsEditing(true);
    } else {
      setJobData(initialJobState);
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setJobData(initialJobState);
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setJobData(prev => ({ ...prev, [name]: value }));
  };


  // --- Statistics and Filtering (Unchanged) ---

  const stats = useMemo(() => {
    const total = jobs.length;
    const interviews = jobs.filter(j => j.status.includes('Interview') || j.status === 'Technical Screen').length;
    const offers = jobs.filter(j => j.status === 'Offer').length;
    const rejected = jobs.filter(j => j.status === 'Rejected').length;
    const followUps = jobs.filter(j => j.followUpDate && isOverdue(j.followUpDate)).length;

    const offerRate = total > 0 ? (offers / total * 100).toFixed(1) : 0;

    return { total, interviews, offers, rejected, followUps, offerRate };
  }, [jobs]);


  const filteredJobs = useMemo(() => {
    if (filterStatus === 'All') return jobs;
    if (filterStatus === 'FollowUp') return jobs.filter(j => j.followUpDate && isOverdue(j.followUpDate));
    return jobs.filter(job => job.status === filterStatus);
  }, [jobs, filterStatus]);


  // --- UI Components ---

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`p-4 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center text-center border-b-4 ${color}`}>
      <div className={`text-4xl ${color.replace('border-b-4', 'text')}`}>{icon}</div>
      <p className="text-2xl font-bold mt-1 text-gray-800">{value}</p>
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  );

  const JobItem = ({ job }) => {
    const isUrgent = job.followUpDate && isOverdue(job.followUpDate);

    const getStatusColor = (status) => {
      switch (status) {
        case 'Offer': return 'text-emerald-600 bg-emerald-100 border-emerald-500';
        case 'Interviewing':
        case 'Technical Screen': return 'text-blue-600 bg-blue-100 border-blue-500';
        case 'Rejected': return 'text-red-600 bg-red-100 border-red-500';
        case 'Applied': return 'text-yellow-600 bg-yellow-100 border-yellow-500';
        default: return 'text-gray-600 bg-gray-100 border-gray-400';
      }
    };

    return (
      <div className="bg-white p-4 mb-3 rounded-xl shadow-md border-l-4 border-indigo-500 transition duration-150 hover:shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">{job.title || 'Untitled Job'}</h3>
            <p className="text-sm text-indigo-600 font-semibold">{job.company || 'Unknown Company'}</p>
          </div>
          <div className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(job.status)}`}>
            {job.status}
          </div>
        </div>

        <div className="mt-3 text-sm grid grid-cols-2 gap-2 text-gray-600">
          <div>
            <span className="font-semibold text-gray-500">Applied: </span>
            {formatDate(job.dateApplied)}
          </div>
          <div className={isUrgent ? 'text-red-500 font-bold' : 'text-gray-600'}>
            <span className="font-semibold text-gray-500">Follow-up: </span>
            {job.followUpDate ? formatDate(job.followUpDate) : 'None'}
            {isUrgent && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">OVERDUE</span>}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          {job.link && (
            <a
              href={job.link.startsWith('http') ? job.link : `https://${job.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-indigo-600 hover:bg-indigo-50 transition duration-150"
              title="View Job Link"
            >
              <ExternalLinkIcon className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => handleOpenModal(job)}
            className="p-2 rounded-full text-blue-600 hover:bg-blue-50 transition duration-150"
            title="Edit Application"
          >
            <EditIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDeleteJob(job.id)}
            className="p-2 rounded-full text-red-600 hover:bg-red-50 transition duration-150"
            title="Delete Application"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const AddEditJobModal = () => {
    // LLM Drafting State
    const [draftResult, setDraftResult] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);
    const [draftError, setDraftError] = useState('');
    const apiKey = ""; // Keep as empty string

    useEffect(() => {
        // Clear draft results when modal opens/closes or jobData changes (for new job)
        setDraftResult('');
        setDraftError('');
    }, [isModalOpen, jobData.id]);
    
    // Function to copy text to clipboard
    const copyToClipboard = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            // Using a simple visual feedback instead of alert
            setDraftError("Draft copied to clipboard!");
            setTimeout(() => setDraftError(''), 3000);
        } catch (err) {
            console.error('Could not copy text: ', err);
            setDraftError("Failed to copy text. Please copy manually.");
        }
        document.body.removeChild(textarea);
    };

    const handleDraftEmail = async () => {
        setIsDrafting(true);
        setDraftResult('');
        setDraftError('');

        // 1. Prepare Prompt
        const statusText = jobData.status;
        const notesText = jobData.notes || 'No specific notes recorded.';
        const prompt = `Draft a concise, professional follow-up email. 
            The job title is "${jobData.title}" at "${jobData.company}". 
            The current application status is "${statusText}". 
            Context/Notes from the job seeker: "${notesText}".
            If the status is 'Applied', draft a check-in email. 
            If the status is 'Interviewing' or 'Technical Screen', draft a thank-you note or a request for next steps.
            If the status is 'Rejected', draft a polite request for feedback.
            Do not include placeholders for the recipient's name or your signature. Start directly with a brief opening (e.g., "Dear Hiring Team,").`;

        // 2. Prepare API Payload
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: {
                parts: [{ text: "You are a professional career coach and email drafting assistant. Generate only the body of the email in a kind, direct, and professional tone. Keep it concise, under 200 words." }]
            },
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // 3. API Call with Exponential Backoff
        let attempt = 0;
        const maxRetries = 3;
        
        while (attempt < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429 && attempt < maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        attempt++;
                        continue; // Retry
                    }
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate email draft.';
                setDraftResult(text);
                break; // Success
            } catch (error) {
                console.error('Gemini API error:', error);
                setDraftError(`Failed to draft email: ${error.message}`);
                break; // Fail immediately on non-429 errors or after max retries
            }
        }
        
        setIsDrafting(false);
    };


    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalOpen ? 'block' : 'hidden'}`} aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <form onSubmit={handleSaveJob}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4" id="modal-title">
                  {isEditing ? 'Edit Application' : 'Add New Application'}
                </h3>
                <div className="space-y-4">
                  {/* Inputs for Title, Company, Link, Status, Dates, Notes */}
                  <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Title *</label><input type="text" name="title" id="title" required value={jobData.title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/></div>
                  <div><label htmlFor="company" className="block text-sm font-medium text-gray-700">Company *</label><input type="text" name="company" id="company" required value={jobData.company} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/></div>
                  <div><label htmlFor="link" className="block text-sm font-medium text-gray-700">Job Link</label><input type="url" name="link" id="link" value={jobData.link} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" placeholder="https://example.com/job-post"/></div>

                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status *</label>
                      <select name="status" id="status" required value={jobData.status} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="dateApplied" className="block text-sm font-medium text-gray-700">Date Applied *</label>
                      <input type="date" name="dateApplied" id="dateApplied" required value={jobData.dateApplied} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">Follow-up Reminder Date</label>
                    <input type="date" name="followUpDate" id="followUpDate" value={jobData.followUpDate} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    <p className="text-xs text-gray-500 mt-1">Set a date for a follow-up email or call.</p>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea name="notes" id="notes" rows="3" value={jobData.notes} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"></textarea>
                  </div>

                  {/* New LLM Feature Section */}
                  {isEditing && (jobData.title && jobData.company) && (
                    <div className="border-t pt-4 mt-4 border-gray-200">
                        <h4 className="text-lg font-bold text-indigo-700 mb-3">AI Follow-up Assistant</h4>
                        <button
                            type="button"
                            onClick={handleDraftEmail}
                            disabled={isDrafting}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-md hover:bg-purple-700 transition duration-150 transform hover:scale-[1.01] disabled:opacity-50"
                        >
                            <SparkleIcon className="w-5 h-5" />
                            <span>{isDrafting ? 'Drafting...' : '✨ Draft Follow-up Email'}</span>
                        </button>

                        {draftError && (
                            <div className="mt-3 p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-300">
                                {draftError}
                            </div>
                        )}

                        {draftResult && (
                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <h5 className="text-sm font-semibold text-gray-800 mb-2">Generated Draft:</h5>
                                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 p-3 bg-white border rounded-md overflow-x-auto">
                                    {draftResult}
                                </pre>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(draftResult)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150"
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition duration-150">
                  {isEditing ? 'Update Application' : 'Add Application'}
                </button>
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition duration-150" onClick={handleCloseModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };


  // --- Main Render Logic (Unchanged) ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl text-indigo-600 font-semibold animate-pulse">Loading App and Checking Authentication...</div>
      </div>
    );
  }

  if (!userId) {
    // Show authentication modal if user is not logged in and not loading
    return <AuthModal handleSignUp={handleSignUp} handleSignIn={handleSignIn} isLoading={loading} />;
  }

  // --- Main Job Tracker Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
      {/* Header and Add/Sign Out Button */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Job Search Navigator</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-full shadow-lg hover:bg-indigo-700 transition duration-150 transform hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add Job</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-800 font-medium rounded-full shadow-lg hover:bg-gray-300 transition duration-150 transform hover:scale-105"
            title="Sign Out"
          >
            <LogOutIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* User ID and Status */}
      <div className="text-sm text-gray-500 mb-6 p-3 bg-white rounded-lg shadow-sm border-l-4 border-indigo-500 flex items-center justify-between">
        <span className="font-semibold text-gray-800">
          Logged in as: <code className="text-xs text-indigo-700 bg-indigo-50 p-1 rounded-sm">{userId || 'N/A'}</code>
        </span>
        <span className="text-green-600 font-bold">Authenticated</span>
      </div>

      {/* Statistics Dashboard */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <ChartIcon className="w-6 h-6 mr-2 text-indigo-600" />
          Application Analytics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Applications" value={stats.total} icon="🎯" color="border-b-4 border-indigo-500" />
          <StatCard title="Interviews Scheduled" value={stats.interviews} icon="📞" color="border-b-4 border-blue-500" />
          <StatCard title="Offers Received" value={stats.offers} icon="🎉" color="border-b-4 border-emerald-500" />
          <StatCard title={`Offer Rate (${stats.total > 0 ? '%' : 'N/A'})`} value={stats.offerRate} icon="📈" color="border-b-4 border-purple-500" />
        </div>
        {stats.followUps > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-xl text-red-800 flex items-center shadow-md">
            <ClockIcon className="w-5 h-5 mr-2" />
            **{stats.followUps}** follow-up(s) are overdue! Time to send that email.
          </div>
        )}
      </section>

      {/* Application Tracking List */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Job Pipeline</h2>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
          >
            <option value="All">All Statuses</option>
            <option value="FollowUp">Overdue Follow-ups</option>
            <option disabled>---</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Job List */}
        <div className="space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map(job => <JobItem key={job.id} job={job} />)
          ) : (
            <div className="p-10 text-center bg-white rounded-xl shadow-md border-2 border-dashed border-gray-200 text-gray-500">
              No applications found. Click **Add Job** to get started!
            </div>
          )}
        </div>
      </section>

      {/* Modal Render */}
      <AddEditJobModal />
    </div>
  );
};

export default App;

// https://www.google.com/search?q=react+page+with+two+independent+form+onSubmit+and+useEffect&client=firefox-b-1-d&sca_esv=42764d033c29afff&ei=U53haLD9OLiqur8PpJKX-Ag&ved=0ahUKEwjw8ofXyYuQAxU4le4BHSTJBY8Q4dUDCBA&uact=5&oq=react+page+with+two+independent+form+onSubmit+and+useEffect&gs_lp=Egxnd3Mtd2l6LXNlcnAiO3JlYWN0IHBhZ2Ugd2l0aCB0d28gaW5kZXBlbmRlbnQgZm9ybSBvblN1Ym1pdCBhbmQgdXNlRWZmZWN0MgUQIRigATIFECEYoAEyBRAhGKABMgUQIRigATIFECEYoAFItE5QgRFYiU1wAXgBkAEAmAFaoAHOA6oBATa4AQPIAQD4AQH4AQKYAgegAu8DwgIKEAAYsAMY1gQYR8ICBRAhGKsCwgIFECEYnwWYAwCIBgGQBgiSBwE3oAepL7IHATa4B-cDwgcFMC4zLjTIBxU&sclient=gws-wiz-serp

import React, { useState, useEffect } from 'react';

// Form 1: User Profile
const ProfileForm = ({ onProfileSubmit }) => {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'submitting', 'success', 'error'

  // An effect that runs whenever the profile state changes.
  // In a real application, this might be used for validation or autosaving.
  useEffect(() => {
    if (profile.name || profile.email) {
      console.log('Profile data has changed:', profile);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({ ...prevProfile, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionStatus('submitting');
    try {
      await onProfileSubmit(profile);
      setSubmissionStatus('success');
      console.log('Profile form submitted successfully!');
    } catch (error) {
      setSubmissionStatus('error');
      console.error('Profile form submission failed:', error);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
      <h2>Profile Form</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            name="name"
            type="text"
            value={profile.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            value={profile.email}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" disabled={submissionStatus === 'submitting'}>
          {submissionStatus === 'submitting' ? 'Submitting...' : 'Submit Profile'}
        </button>
        {submissionStatus === 'success' && <p style={{ color: 'green' }}>Profile updated!</p>}
        {submissionStatus === 'error' && <p style={{ color: 'red' }}>Error submitting form.</p>}
      </form>
    </div>
  );
};

// Form 2: Subscription
const SubscriptionForm = ({ onSubscriptionSubmit }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  // A separate effect that only runs when the subscription status changes.
  useEffect(() => {
    console.log(`Subscription status is now: ${isSubscribed ? 'Active' : 'Inactive'}`);
  }, [isSubscribed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubscriptionSubmit(isSubscribed);
    console.log('Subscription form submitted!');
  };

  const toggleSubscription = () => {
    setIsSubscribed(prev => !prev);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', borderRadius: '5px' }}>
      <h2>Subscription Form</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            id="subscribe"
            name="subscribe"
            type="checkbox"
            checked={isSubscribed}
            onChange={toggleSubscription}
          />
          <label htmlFor="subscribe">Subscribe to Newsletter</label>
        </div>
        <button type="submit">Update Subscription</button>
      </form>
    </div>
  );
};

// Main component rendering the two forms
const TwoIndependentForms = () => {

  const handleProfileSubmit = (data) => {
    // Simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('API call for profile with data:', data);
        resolve();
      }, 1000);
    });
  };

  const handleSubscriptionSubmit = (status) => {
    // Simulate another API call
    console.log('API call for subscription with status:', status);
  };

  return (
    <div>
      <h1>Two Independent Forms</h1>
      <ProfileForm onProfileSubmit={handleProfileSubmit} />
      <SubscriptionForm onSubscriptionSubmit={handleSubscriptionSubmit} />
    </div>
  );
};

export default TwoIndependentForms;

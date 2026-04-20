import { supabase, supabaseAuth } from '../config/supabase';

export const registerUser = async (userData: any) => {
  const { username, email, phone, password, isAdultConfirmed, termsAccepted } = userData;

  // Case-insensitive check
  const lowerUsername = username.toLowerCase();
  const lowerEmail = email.toLowerCase();

  // Check uniqueness in public.users before attempting Auth signup
  // This prevents "Database error saving new user" which is often a trigger failure due to unique constraints
  // We use an RPC function because the anon key cannot read other users' data due to RLS
  const { data: uniqueness, error: checkError } = await supabase
    .rpc('check_user_uniqueness', {
      p_username: lowerUsername,
      p_email: lowerEmail,
      p_phone: phone || null
    });

  if (checkError) {
    console.error('Pre-registration check error:', checkError);
    // If the RPC itself fails (e.g. not found), we should probably stop to avoid the "Database error" later
    throw { status: 500, message: 'Registration service is temporarily unavailable. Please try again soon.' };
  }

  if (uniqueness) {
    // Handle both old boolean format and new jsonb format for robustness
    if (typeof uniqueness === 'boolean') {
      if (!uniqueness) {
        throw { status: 400, message: 'Username, email or phone is already registered' };
      }
    } else {
      if (uniqueness.username_exists) throw { status: 400, message: 'Username is already taken' };
      if (uniqueness.email_exists) throw { status: 400, message: 'Email is already registered' };
      if (uniqueness.phone_exists) throw { status: 400, message: 'Phone number is already registered' };
    }
  }

  // Sign up with Supabase Auth
  // We use the metadata (options.data) to pass extra fields to our trigger
  const { data, error } = await supabaseAuth.auth.signUp({
    email: lowerEmail,
    password,
    options: {
      data: {
        username: lowerUsername,
        phone,
        isAdultConfirmed,
        termsAccepted
      }
    }
  });

  if (error) {
    console.error('Registration Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    // Improve error message from Supabase Auth if uniqueness check missed it
    let message = error.message;
    if (message === 'User already registered') {
      message = 'Email is already registered';
    }
    throw { 
      status: 400, 
      message 
    };
  }

  if (!data.user) {
    throw { status: 500, message: 'User creation failed' };
  }

  return {
    message: 'User registered successfully. Please check your email for confirmation.',
    user: { id: data.user.id, username: lowerUsername, email: data.user.email },
    session: data.session
  };
};

export const loginUser = async (identifier: string, password: string) => {
  // Case-insensitive identifier
  const lowerIdentifier = identifier.toLowerCase();

  // Supabase Auth requires email for signInWithPassword
  // If the identifier is a username, we first need to find the email
  let email = lowerIdentifier;
  if (!lowerIdentifier.includes('@')) {
    const { data: userEmail, error: userError } = await supabase
      .rpc('get_user_email_by_username', { p_username: lowerIdentifier });
    
    if (userError) {
      console.error('Username lookup error:', userError);
      throw { status: 500, message: 'Internal server error' };
    }

    if (!userEmail) {
      throw { status: 401, message: 'User not found' };
    }
    email = userEmail;
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Error:', error);
    // Improve error message
    let message = error.message;
    if (message === 'Invalid login credentials') {
      message = 'Incorrect password';
    }
    throw { status: 401, message };
  }

  return {
    message: 'Login successful',
    user: { 
      id: data.user.id, 
      email: data.user.email,
      username: data.user.user_metadata?.username 
    },
    session: data.session
  };
};

export const getUserById = async (id: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, phone, created_at, last_login_at, status')
    .eq('id', id)
    .single();

  if (!user || error) {
    throw { status: 404, message: 'User not found' };
  }

  return user;
};

export const refreshToken = async (refreshToken: string) => {
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });

  if (error) {
    console.error('Refresh Token Error:', error);
    throw { status: 401, message: 'Session expired. Please log in again.' };
  }

  return {
    message: 'Session refreshed',
    user: { 
      id: data.user?.id, 
      email: data.user?.email,
      username: data.user?.user_metadata?.username 
    },
    session: data.session
  };
};

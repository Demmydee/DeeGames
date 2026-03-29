import { supabase } from '../config/supabase';

export const registerUser = async (userData: any) => {
  const { username, email, phone, password, isAdultConfirmed, termsAccepted } = userData;

  // Check uniqueness in public.users before attempting Auth signup
  // This prevents "Database error saving new user" which is often a trigger failure due to unique constraints
  // We use an RPC function because the anon key cannot read other users' data due to RLS
  const { data: uniqueness, error: checkError } = await supabase
    .rpc('check_user_uniqueness', {
      p_username: username,
      p_email: email,
      p_phone: phone
    });

  if (checkError) {
    console.error('Pre-registration check error:', checkError);
  }

  if (uniqueness) {
    if (uniqueness.username_exists) throw { status: 400, message: 'Username is already taken' };
    if (uniqueness.email_exists) throw { status: 400, message: 'Email is already registered' };
    if (uniqueness.phone_exists) throw { status: 400, message: 'Phone number is already registered' };
  }

  // Sign up with Supabase Auth
  // We use the metadata (options.data) to pass extra fields to our trigger
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        phone,
        isAdultConfirmed,
        termsAccepted
      }
    }
  });

  if (error) {
    console.error('Registration Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw { 
      status: 400, 
      message: error.message 
    };
  }

  if (!data.user) {
    throw { status: 500, message: 'User creation failed' };
  }

  return {
    message: 'User registered successfully. Please check your email for confirmation.',
    user: { id: data.user.id, username, email: data.user.email },
    session: data.session
  };
};

export const loginUser = async (identifier: string, password: string) => {
  // Supabase Auth requires email for signInWithPassword
  // If the identifier is a username, we first need to find the email
  let email = identifier;
  if (!identifier.includes('@')) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('username', identifier)
      .single();
    
    if (userError || !userData) {
      throw { status: 401, message: 'User not found' };
    }
    email = userData.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Error:', error);
    throw { status: 401, message: error.message };
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

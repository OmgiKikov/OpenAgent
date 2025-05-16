'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const returnUrl = formData.get('returnUrl') as string | undefined;

  if (!email || !email.includes('@')) {
    return { message: 'Пожалуйста, введите корректный email' };
  }

  if (!password || password.length < 6) {
    return { message: 'Пароль должен содержать минимум 6 символов' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: error.message || 'Не удалось авторизовать пользователя' };
  }

  // Use client-side navigation instead of server-side redirect
  return { success: true, redirectTo: returnUrl || '/dashboard' };
}

export async function signUp(prevState: any, formData: FormData) {
  const origin = formData.get('origin') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const returnUrl = formData.get('returnUrl') as string | undefined;

  if (!email || !email.includes('@')) {
    return { message: 'Пожалуйста, введите корректный email' };
  }

  if (!password || password.length < 6) {
    return { message: 'Пароль должен содержать минимум 6 символов' };
  }

  if (password !== confirmPassword) {
    return { message: 'Пароли не совпадают' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?returnUrl=${returnUrl}`,
    },
  });

  if (error) {
    return { message: error.message || 'Не удалось создать аккаунт' };
  }

  // Try to sign in immediately
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      message:
        'Аккаунт создан! Проверьте вашу почту для подтверждения регистрации.',
    };
  }

  // Use client-side navigation instead of server-side redirect
  return { success: true, redirectTo: returnUrl || '/dashboard' };
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const origin = formData.get('origin') as string;

  if (!email || !email.includes('@')) {
    return { message: 'Пожалуйста, введите корректный email' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { message: error.message || 'Не удалось отправить письмо для сброса пароля' };
  }

  return {
    success: true,
    message: 'Проверьте вашу почту — мы отправили ссылку для сброса пароля',
  };
}

export async function resetPassword(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    return { message: 'Пароль должен содержать минимум 6 символов' };
  }

  if (password !== confirmPassword) {
    return { message: 'Пароли не совпадают' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { message: error.message || 'Не удалось обновить пароль' };
  }

  return {
    success: true,
    message: 'Пароль успешно обновлён',
  };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { message: error.message || 'Не удалось выйти из аккаунта' };
  }

  return redirect('/');
}

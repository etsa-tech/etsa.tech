'use client';

import { useState, useRef, useEffect } from 'react';
import { validateName, validateEmail, validateSubject, validateMessage } from '@/lib/validation';

interface ContactFormProps {
  className?: string;
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  captcha?: string;
  general?: string;
}

export default function ContactForm({ className = '' }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  
  const captchaRef = useRef<any>(null);
  const [captchaLoaded, setCaptchaLoaded] = useState(false);

  // Load HCaptcha
  useEffect(() => {
    const loadHCaptcha = () => {
      if (typeof window !== 'undefined' && (window as any).hcaptcha && !captchaRef.current) {
        try {
          captchaRef.current = (window as any).hcaptcha.render('hcaptcha-container', {
            sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
            callback: (token: string) => {
              setErrors(prev => ({ ...prev, captcha: undefined }));
            },
            'expired-callback': () => {
              setErrors(prev => ({ ...prev, captcha: 'Captcha expired. Please try again.' }));
            },
            'error-callback': () => {
              setErrors(prev => ({ ...prev, captcha: 'Captcha error. Please try again.' }));
            },
          });
          setCaptchaLoaded(true);
        } catch (error) {
          console.error('HCaptcha render error:', error);
        }
      }
    };

    // Load script if not already loaded
    if (!document.querySelector('script[src*="hcaptcha.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js';
      script.async = true;
      script.defer = true;
      script.onload = loadHCaptcha;
      document.head.appendChild(script);
    } else {
      loadHCaptcha();
    }

    return () => {
      // Cleanup on unmount
      if (captchaRef.current && (window as any).hcaptcha) {
        try {
          (window as any).hcaptcha.remove(captchaRef.current);
        } catch (error) {
          console.error('HCaptcha cleanup error:', error);
        }
      }
    };
  }, []);

  // Real-time validation
  const validateField = (name: string, value: string) => {
    let error: string | null = null;
    
    switch (name) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'subject':
        error = validateSubject(value);
        break;
      case 'message':
        error = validateMessage(value);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error || undefined,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear submit status when user starts typing
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
      setSubmitMessage('');
    }
    
    // Real-time validation (only show errors after user has started typing)
    if (value.length > 0) {
      validateField(name, value);
    } else {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSubmitStatus('idle');

    try {
      // Validate all fields
      const fieldErrors: FormErrors = {};
      
      const nameError = validateName(formData.name);
      if (nameError) fieldErrors.name = nameError;
      
      const emailError = validateEmail(formData.email);
      if (emailError) fieldErrors.email = emailError;
      
      const subjectError = validateSubject(formData.subject);
      if (subjectError) fieldErrors.subject = subjectError;
      
      const messageError = validateMessage(formData.message);
      if (messageError) fieldErrors.message = messageError;

      // Get captcha token
      let captchaToken = '';
      if (captchaRef.current) {
        captchaToken = captchaRef.current.getResponse();
        if (!captchaToken) {
          fieldErrors.captcha = 'Please complete the captcha verification';
        }
      } else {
        fieldErrors.captcha = 'Captcha not loaded. Please refresh the page.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      // For static export, we'll show a success message and provide alternative contact methods
      setSubmitStatus('success');
      setSubmitMessage('Thank you for your message! Since this is a static site, please send your message directly to our email or contact us via Meetup.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setErrors({});
      if (captchaRef.current) {
        captchaRef.current.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
      setSubmitMessage('Network error. Please check your connection and try again.');
      if (captchaRef.current) {
        captchaRef.current.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.name 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } text-gray-900 dark:text-gray-100`}
            placeholder="Your full name"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.email 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } text-gray-900 dark:text-gray-100`}
            placeholder="your.email@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Subject Field */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Subject *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.subject 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } text-gray-900 dark:text-gray-100`}
            placeholder="What's this about?"
            disabled={isSubmitting}
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
          )}
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={formData.message}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors resize-vertical ${
              errors.message 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } text-gray-900 dark:text-gray-100`}
            placeholder="Tell us what's on your mind..."
            disabled={isSubmitting}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>
          )}
        </div>

        {/* HCaptcha */}
        <div>
          <div id="hcaptcha-container" className="flex justify-center min-h-[78px]">
            {!captchaLoaded && (
              <div className="flex items-center justify-center h-[78px] w-full bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-gray-500 dark:text-gray-400">Loading captcha...</span>
              </div>
            )}
          </div>
          {errors.captcha && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{errors.captcha}</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-etsa-primary hover:bg-etsa-secondary text-white'
            }`}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-center">{submitMessage}</p>
          </div>
        )}

        {submitStatus === 'error' && submitMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-center">{submitMessage}</p>
          </div>
        )}
      </form>


    </div>
  );
}

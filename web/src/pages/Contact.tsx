import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>();

  const contactMutation = useMutation({
    mutationFn: (data: ContactForm) => api.post('/contact', data),
    onSuccess: () => {
      setIsSubmitted(true);
      reset();
      toast.success('Message envoyé avec succès !');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
    },
  });

  const onSubmit = (data: ContactForm) => {
    contactMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-green-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            Message envoyé !
          </h2>
          <p className="text-green-700 mb-6">
            Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-green-600 hover:underline"
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Contactez-nous
      </h1>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold mb-1">Email</h3>
          <p className="text-gray-600">denonciation.world@gmail.com</p>
          <p className="text-gray-600">denonciation.world@gmail.com</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold mb-1">Téléphone</h3>
          <p className="text-gray-600">+243 000 000 000</p>
          <p className="text-gray-600">Lun-Ven, 9h-18h</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold mb-1">Adresse</h3>
          <p className="text-gray-600">29 Bis, Avenue Kitona</p>
          <p className="text-gray-600">Kinshasa, RDC</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Envoyez-nous un message
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Nom complet *</label>
              <input
                type="text"
                {...register('name', { required: 'Le nom est requis' })}
                className="input-field"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                {...register('email', {
                  required: 'L\'email est requis',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
                })}
                className="input-field"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sujet *</label>
            <input
              type="text"
              {...register('subject', { required: 'Le sujet est requis' })}
              className="input-field"
            />
            {errors.subject && (
              <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message *</label>
            <textarea
              {...register('message', {
                required: 'Le message est requis',
                minLength: { value: 20, message: 'Minimum 20 caractères' },
              })}
              rows={6}
              className="input-field"
            />
            {errors.message && (
              <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer le message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
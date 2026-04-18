import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Video, Lock, DollarSign, X } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStreamFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface CreateStreamFormData {
  title: string;
  description: string;
  is_premium: boolean;
  price: number;
}

export default function CreateStreamModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}: CreateStreamModalProps) {
  const [isPremium, setIsPremium] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateStreamFormData>({
    defaultValues: {
      is_premium: false,
      price: 0,
    },
  });

  const handleClose = () => {
    reset();
    setIsPremium(false);
    onClose();
  };

  const onFormSubmit = async (data: CreateStreamFormData) => {
    await onSubmit(data);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Démarrer un live" size="lg">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <Input
          label="Titre du live *"
          placeholder="Ex: Manifestation pacifique à Kinshasa"
          error={errors.title?.message}
          {...register('title', {
            required: 'Le titre est requis',
            minLength: { value: 3, message: 'Minimum 3 caractères' },
            maxLength: { value: 255, message: 'Maximum 255 caractères' },
          })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={4}
            className="input-field"
            placeholder="Décrivez ce que vous allez diffuser..."
            {...register('description')}
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className={`w-5 h-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div>
                <h3 className="font-medium">Stream Premium</h3>
                <p className="text-sm text-gray-600">
                  Faites payer l'accès à votre stream. Vous recevrez 80% des revenus.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('is_premium')}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>

          {isPremium && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('price', {
                    required: isPremium ? 'Le prix est requis' : false,
                    min: { value: 0.01, message: 'Le prix minimum est 0.01 USD' },
                  })}
                  className="input-field pl-10 w-48"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Important :</strong> Votre stream sera visible publiquement. 
            Respectez les conditions d'utilisation. Les contenus inappropriés seront supprimés.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" loading={isLoading} icon={<Video className="w-4 h-4" />}>
            Démarrer le live
          </Button>
        </div>
      </form>
    </Modal>
  );
}
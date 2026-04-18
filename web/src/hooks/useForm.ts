import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: any) => boolean | string;
}

interface FieldConfig {
  initialValue?: any;
  rules?: ValidationRule;
}

interface FormConfig {
  [key: string]: FieldConfig;
}

interface FormErrors {
  [key: string]: string | undefined;
}

export function useForm<T extends Record<string, any>>(config: FormConfig) {
  const initialValues = Object.entries(config).reduce(
    (acc, [key, field]) => ({
      ...acc,
      [key]: field.initialValue || '',
    }),
    {} as T
  );

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name: string, value: any): string | undefined => {
      const field = config[name];
      if (!field?.rules) return undefined;

      const { required, minLength, maxLength, pattern, validate } = field.rules;

      if (required && !value) {
        return 'Ce champ est requis';
      }

      if (minLength && value.length < minLength) {
        return `Minimum ${minLength} caractères`;
      }

      if (maxLength && value.length > maxLength) {
        return `Maximum ${maxLength} caractères`;
      }

      if (pattern && !pattern.test(value)) {
        return 'Format invalide';
      }

      if (validate) {
        const result = validate(value);
        if (typeof result === 'string') return result;
        if (result === false) return 'Valeur invalide';
      }

      return undefined;
    },
    [config]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(config).forEach((name) => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, values, validateField]);

  const handleChange = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      
      if (touched[name]) {
        const error = validateField(name as string, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name as string, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [values, validateField]
  );

  const register = useCallback(
    (name: keyof T) => ({
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        handleChange(name, e.target.value),
      onBlur: () => handleBlur(name),
      error: errors[name as string],
      touched: touched[name as string],
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  const setValue = useCallback(
    (name: keyof T, value: any) => {
      handleChange(name, value);
    },
    [handleChange]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => Promise<void> | void) =>
      async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      },
    [values, validateForm]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    register,
    setValue,
    reset,
    handleSubmit,
    validateForm,
  };
}
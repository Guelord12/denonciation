import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      console.log('❌ [VALIDATION] Failed:', errors);
      
      res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
      return;
    }
    
    next();
  };
}

// Schémas de validation
export const schemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(50).required()
      .messages({
        'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
        'string.max': 'Le nom d\'utilisateur doit contenir au maximum 50 caractères',
        'any.required': 'Le nom d\'utilisateur est requis'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Veuillez entrer une adresse email valide',
        'any.required': 'L\'email est requis'
      }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
        'any.required': 'Le mot de passe est requis'
      }),
    first_name: Joi.string().max(100).allow('').optional(),
    last_name: Joi.string().max(100).allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    country: Joi.string().max(100).allow('').optional(),
    city: Joi.string().max(100).allow('').optional(),
    nationality: Joi.string().max(100).allow('').optional(),
    birth_date: Joi.date().allow(null).optional(),
    gender: Joi.string().valid('Homme', 'Femme', 'Autre', '').allow('').optional(),
  }),

  login: Joi.object({
    username: Joi.string().required()
      .messages({
        'any.required': 'Le nom d\'utilisateur ou email est requis'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Le mot de passe est requis'
      })
  }),

  createReport: Joi.object({
    title: Joi.string().min(5).max(255).required()
      .messages({
        'string.min': 'Le titre doit contenir au moins 5 caractères',
        'string.max': 'Le titre doit contenir au maximum 255 caractères',
        'any.required': 'Le titre est requis'
      }),
    description: Joi.string().min(10).required()
      .messages({
        'string.min': 'La description doit contenir au moins 10 caractères',
        'any.required': 'La description est requise'
      }),
    category_id: Joi.number().integer().positive().required()
      .messages({
        'any.required': 'La catégorie est requise'
      }),
    city_id: Joi.number().integer().positive().allow(null).optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    is_live: Joi.boolean().optional()
  }),

  createComment: Joi.object({
    report_id: Joi.number().integer().positive().required(),
    content: Joi.string().min(1).max(1000).required()
      .messages({
        'string.min': 'Le commentaire ne peut pas être vide',
        'string.max': 'Le commentaire doit contenir au maximum 1000 caractères'
      }),
    parent_id: Joi.number().integer().positive().allow(null).optional()
  }),

  updateProfile: Joi.object({
    first_name: Joi.string().max(100).allow('').optional(),
    last_name: Joi.string().max(100).allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    country: Joi.string().max(100).allow('').optional(),
    city: Joi.string().max(100).allow('').optional(),
    nationality: Joi.string().max(100).allow('').optional(),
    birth_date: Joi.date().allow(null).optional(),
    gender: Joi.string().valid('Homme', 'Femme', 'Autre', '').allow('').optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
      })
  }),

  createLiveStream: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).allow('').optional(),
    is_premium: Joi.boolean().optional(),
    price: Joi.number().min(0).when('is_premium', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  sendWarning: Joi.object({
    message: Joi.string().min(10).max(500).required(),
    violationType: Joi.string().required()
  }),

  banUser: Joi.object({
    reason: Joi.string().min(5).max(500).required()
  }),

  updateReportStatus: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected', 'archived').required(),
    reason: Joi.string().max(500).allow('').optional()
  }),

  addWitness: Joi.object({
    testimony: Joi.string().min(10).max(2000).required()
  })
};
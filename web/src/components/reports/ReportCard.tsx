import { Link } from 'react-router-dom';
import { MapPin, Eye, Heart, MessageCircle, Lock, Globe } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportCardProps {
  report: {
    id: number;
    title: string;
    description: string;
    media_path?: string;
    media_type?: string;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
    city_name?: string;
    username?: string;
    user_avatar?: string;
    first_name?: string;
    last_name?: string;
    likes_count?: number;
    comments_count?: number;
    views_count?: number;
    created_at: string;
    is_anonymous?: boolean;
    visibility_mode?: 'anonymous' | 'visible';
    reporter_id?: number;
  };
  currentUserId?: number | null;
}

export default function ReportCard({ report, currentUserId }: ReportCardProps) {
  // ✅ Déterminer si on doit afficher l'identité
  const isOwner = report.reporter_id === currentUserId;
  const showIdentity = !report.is_anonymous && report.visibility_mode === 'visible';
  
  // Anonymiser l'affichage selon les règles
  const displayName = (showIdentity || isOwner) && report.username
    ? report.username
    : 'Utilisateur anonyme';
  
  const displayAvatar = (showIdentity || isOwner) ? report.user_avatar : null;
  const displayInitial = displayName === 'Utilisateur anonyme' ? 'A' : displayName.charAt(0).toUpperCase();

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {report.media_path && report.media_type === 'image' && (
        <Link to={`/reports/${report.id}`}>
          <img
            src={report.media_path}
            alt={report.title}
            className="w-full h-48 object-cover"
          />
        </Link>
      )}
      
      <div className="card-body">
        <div className="flex items-center space-x-2 mb-2">
          <span 
            className="badge"
            style={{ backgroundColor: report.category_color + '20', color: report.category_color }}
          >
            {report.category_icon} {report.category_name}
          </span>
          
          {/* ✅ Badge de visibilité */}
          {report.visibility_mode === 'anonymous' ? (
            <span className="badge bg-purple-100 text-purple-700 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Anonyme</span>
            </span>
          ) : (
            <span className="badge bg-green-100 text-green-700 flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>Visible</span>
            </span>
          )}
        </div>

        <Link to={`/reports/${report.id}`}>
          <h3 className="font-semibold text-lg mb-2 hover:text-red-600 line-clamp-2">
            {report.title}
          </h3>
        </Link>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {report.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-2">
            {/* Avatar avec gestion de l'anonymat */}
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                displayName === 'Utilisateur anonyme' ? 'bg-gray-400' : 'bg-red-600'
              }`}>
                {displayInitial}
              </div>
            )}
            <span>{displayName}</span>
            {isOwner && (
              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Vous</span>
            )}
          </div>
          
          {report.city_name && (
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{report.city_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{report.views_count || 0}</span>
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              <span>{report.likes_count || 0}</span>
            </div>
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span>{report.comments_count || 0}</span>
            </div>
          </div>
          
          <div className="text-xs">
            {formatDistance(new Date(report.created_at), new Date(), { 
              addSuffix: true, 
              locale: fr 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
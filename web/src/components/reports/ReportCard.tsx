import { Link } from 'react-router-dom';
import { MapPin, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
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
    likes_count?: number;
    comments_count?: number;
    views_count?: number;
    created_at: string;
  };
}

export default function ReportCard({ report }: ReportCardProps) {
  // Anonymiser l'affichage
  const displayName = report.username === 'Utilisateur anonyme' || !report.username ? 'Utilisateur anonyme' : report.username;

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
            {/* Avatar anonyme */}
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
              A
            </div>
            <span>{displayName}</span>
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
import { Link } from 'react-router-dom';
import { Users, Heart, Lock } from 'lucide-react';

interface StreamCardProps {
  stream: {
    id: number;
    title: string;
    thumbnail_path?: string;
    username?: string;
    avatar?: string;
    viewer_count?: number;
    like_count?: number;
    is_premium?: boolean;
    price?: number;
    current_viewers?: number;
  };
}

export default function StreamCard({ stream }: StreamCardProps) {
  return (
    <Link to={`/live/${stream.id}`} className="block group">
      <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
        {/* Thumbnail */}
        <div className="relative">
          {stream.thumbnail_path ? (
            <img
              src={stream.thumbnail_path}
              alt={stream.title}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-white text-lg font-medium">En direct</span>
            </div>
          )}

          {/* Live Badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span>
              LIVE
            </span>
          </div>

          {/* Premium Badge */}
          {stream.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center">
                <Lock className="w-3 h-3 mr-1" />
                Premium
              </span>
            </div>
          )}

          {/* Viewer Count */}
          <div className="absolute bottom-2 left-2">
            <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {stream.current_viewers || stream.viewer_count || 0}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-red-600 transition">
            {stream.title}
          </h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {stream.avatar ? (
                <img
                  src={stream.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">
                  {stream.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-600">@{stream.username}</span>
            </div>

            <div className="flex items-center text-gray-500 text-sm">
              <Heart className="w-4 h-4 mr-1" />
              <span>{stream.like_count || 0}</span>
            </div>
          </div>

          {stream.is_premium && (
            <p className="text-xs text-yellow-600 mt-2">
              {stream.price} USD
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
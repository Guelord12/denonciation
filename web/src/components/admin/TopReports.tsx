import { useQuery } from 'react-query';
import { reportAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import { Eye, Heart, MessageCircle } from 'lucide-react';

export default function TopReports() {
  const { data, isLoading } = useQuery('top-reports', () =>
    reportAPI.getReports({ sort: 'views_count', order: 'DESC', limit: 5 }).then((res) => res.data)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data?.reports?.map((report: any, index: number) => (
        <Link
          key={report.id}
          to={`/reports/${report.id}`}
          className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-50 transition"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
            <div>
              <p className="font-medium text-gray-900 line-clamp-1">{report.title}</p>
              <p className="text-xs text-gray-500">@{report.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {report.views_count || 0}
            </span>
            <span className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              {report.likes_count || 0}
            </span>
            <span className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              {report.comments_count || 0}
            </span>
          </div>
        </Link>
      ))}
      {data?.reports?.length === 0 && (
        <p className="text-gray-500 text-center py-4">Aucun signalement</p>
      )}
    </div>
  );
}
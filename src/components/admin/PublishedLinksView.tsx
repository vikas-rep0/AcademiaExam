import React, { useState, useEffect } from 'react';
import {
  Globe,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldAlert,
  Clock,
  Calendar,
  Award,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { PublishedExamLink } from '../../types/exam';
import {
  getAllPublishedExamLinks,
  toggleExamLinkStatus,
  getAllExams
} from '../../services/examService';
import { useAuth } from '../../context/AuthContext';

interface PublishedLinksViewProps {
  onOpenPaperStudio?: () => void;
  onViewLiveMonitoring?: (examId: string) => void;
  onPreviewLobby?: (publicExamId: string) => void;
}

export const PublishedLinksView: React.FC<PublishedLinksViewProps> = ({
  onOpenPaperStudio,
  onViewLiveMonitoring,
  onPreviewLobby,
}) => {
  const { userProfile } = useAuth();
  const [links, setLinks] = useState<PublishedExamLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await getAllPublishedExamLinks();
      setLinks(data);
    } catch (err) {
      console.error('Error loading published links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const getFullShareUrl = (publicExamId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://academiaexam.edu';
    return `${origin}/?exam=${publicExamId}`;
  };

  const handleCopyLink = async (publicExamId: string) => {
    const url = getFullShareUrl(publicExamId);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSlug(publicExamId);
      setToastMessage(`Copied shareable link for ${publicExamId} to clipboard!`);
      setTimeout(() => setCopiedSlug(null), 2500);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Copy failed:', err);
      prompt('Copy this exam link manually:', url);
    }
  };

  const handleNativeShare = async (link: PublishedExamLink) => {
    const url = getFullShareUrl(link.publicExamId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${link.title} - Online Examination`,
          text: `Official Examination Portal for ${link.title} (${link.courseCode || 'College Exam'}). Access with your student roll number.`,
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink(link.publicExamId);
    }
  };

  const handleToggleStatus = async (link: PublishedExamLink) => {
    if (!userProfile) return;
    const nextStatus = link.status === 'active' ? 'disabled' : 'active';
    setTogglingSlug(link.publicExamId);
    try {
      await toggleExamLinkStatus(link.publicExamId, nextStatus, {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
      });
      setLinks((prev) =>
        prev.map((l) => (l.publicExamId === link.publicExamId ? { ...l, status: nextStatus } : l))
      );
      setToastMessage(
        nextStatus === 'active'
          ? `Exam link ${link.publicExamId} is now ACTIVE and open for candidate login.`
          : `Exam link ${link.publicExamId} has been DISABLED. Candidate logins are blocked.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Toggle status error:', err);
    } finally {
      setTogglingSlug(null);
    }
  };

  const filteredLinks = links.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.publicExamId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.courseCode && l.courseCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.subject && l.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-blue-700 font-bold hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Controls Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Public Assessment URLs</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Published Shareable Exam Links
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Distribute tamper-resistant exam URLs to students. Controlled access with instant lockouts and real-time proctoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={loadLinks}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh links"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenPaperStudio && (
            <button
              onClick={onOpenPaperStudio}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-2 transition"
            >
              <Layers className="w-4 h-4" />
              <span>Create Paper in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, course code, or link slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Filter Status:</span>
          {(['all', 'active', 'disabled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading published links...</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No published links found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery
              ? 'No links match your current search filters.'
              : 'Create and publish an exam paper in the Paper Builder Studio to generate unique shareable links.'}
          </p>
          {onOpenPaperStudio && (
            <button
              onClick={onOpenPaperStudio}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 inline-flex items-center space-x-2"
            >
              <Layers className="w-4 h-4" />
              <span>Launch Paper Studio</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLinks.map((link) => {
            const isCopied = copiedSlug === link.publicExamId;
            const fullUrl = getFullShareUrl(link.publicExamId);
            const isToggling = togglingSlug === link.publicExamId;
            const formattedDate = new Date(link.scheduledStartAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={link.publicExamId}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow ${
                  link.status === 'active' ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Metadata */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                          link.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            link.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span>{link.status === 'active' ? 'Active & Open' : 'Disabled / Paused'}</span>
                      </span>

                      {link.courseCode && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 font-mono">
                          {link.courseCode}
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-mono">
                        Slug: <strong className="text-slate-700">{link.publicExamId}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {link.title}
                    </h3>

                    {/* Zero-pill metadata inline */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{link.durationMinutes} Minutes</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>Total: {link.totalMarks} Marks (Pass: {link.passingMarks})</span>
                      </span>
                      {link.negativeMarking && (
                        <>
                          <span>·</span>
                          <span className="text-red-600 font-medium">Negative Marking</span>
                        </>
                      )}
                    </div>

                    {/* URL Input Box */}
                    <div className="pt-2 flex items-center space-x-2 max-w-2xl">
                      <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 overflow-hidden font-mono text-xs text-slate-600">
                        <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                        <span className="truncate select-all">{fullUrl}</span>
                      </div>

                      <button
                        onClick={() => handleCopyLink(link.publicExamId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleNativeShare(link)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition"
                        title="Share via device"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                    {/* Toggle Active / Disabled */}
                    <button
                      onClick={() => handleToggleStatus(link)}
                      disabled={isToggling}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition ${
                        link.status === 'active'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {link.status === 'active' ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-amber-600" />
                          <span>Disable Link</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-emerald-600" />
                          <span>Enable Link</span>
                        </>
                      )}
                    </button>

                    {/* Preview Candidate Lobby */}
                    <button
                      onClick={() => {
                        if (onPreviewLobby) {
                          onPreviewLobby(link.publicExamId);
                        } else {
                          window.open(fullUrl, '_blank');
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center space-x-1.5 shadow-sm transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Candidate Lobby</span>
                    </button>

                    {/* Live Proctoring */}
                    {onViewLiveMonitoring && (
                      <button
                        onClick={() => onViewLiveMonitoring(link.examId)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 flex items-center justify-center space-x-1.5 transition"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Live Proctor</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

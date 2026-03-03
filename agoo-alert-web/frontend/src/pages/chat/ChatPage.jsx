import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { conversationAPI, uploadAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import { Send, ArrowLeft, Image, Mic, Video, User, Paperclip } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const liveVideoRef = useRef(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_conversation', id);
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (attachmentPreview?.previewUrl) {
        URL.revokeObjectURL(attachmentPreview.previewUrl);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [attachmentPreview]);

  useEffect(() => {
    if (!recording) return;

    const timer = setInterval(() => {
      if (!recordingStartRef.current) return;
      const sec = Math.max(0, Math.floor((Date.now() - recordingStartRef.current) / 1000));
      setRecordingSeconds(sec);
    }, 250);

    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recording?.mode !== 'video') return;
    if (!liveVideoRef.current) return;
    if (!mediaStreamRef.current) return;

    liveVideoRef.current.srcObject = mediaStreamRef.current;
    const p = liveVideoRef.current.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [recording]);

  const setupSocket = () => {
    const token = localStorage.getItem('accessToken');
    const socketUrl = import.meta.env.VITE_CHAT_SOCKET_URL || 'http://localhost:5004';
    socketRef.current = io(socketUrl, { auth: { token } });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_conversation', id);
    });

    socketRef.current.on('new_message', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('user_typing', () => setTyping(true));
    socketRef.current.on('user_stop_typing', () => setTyping(false));
  };

  const loadConversation = async () => {
    try {
      const { data } = await conversationAPI.getById(id);
      setConversation(data.conversation);
    } catch (error) {
      toast.error('Conversation non trouvée');
    }
  };

  const loadMessages = async () => {
    try {
      const { data } = await conversationAPI.getMessages(id, { limit: 100 });
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await conversationAPI.sendMessage(id, {
        type: 'text',
        content: newMessage.trim(),
      });
      setNewMessage('');
      socketRef.current?.emit('stop_typing', { conversationId: id });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (attachmentPreview?.previewUrl) {
      URL.revokeObjectURL(attachmentPreview.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    const type = file.type.startsWith('audio/')
      ? 'audio'
      : file.type.startsWith('video/')
        ? 'video'
        : 'image';

    setAttachmentPreview({
      type,
      file,
      previewUrl,
      duration: null,
    });

    e.target.value = '';
  };

  const cancelAttachment = () => {
    if (attachmentPreview?.previewUrl) {
      URL.revokeObjectURL(attachmentPreview.previewUrl);
    }
    setAttachmentPreview(null);
  };

  const sendAttachment = async () => {
    if (!attachmentPreview?.file) return;

    setSending(true);
    try {
      const { type, file, duration } = attachmentPreview;

      let uploadFn = uploadAPI.image;
      if (type === 'audio') uploadFn = uploadAPI.audio;
      if (type === 'video') uploadFn = uploadAPI.video;

      const { data } = await uploadFn(file, duration || undefined);

      await conversationAPI.sendMessage(id, {
        type,
        content: `[${type}]`,
        attachment: {
          url: data.url,
          type: file.type,
          name: file.name,
          size: file.size,
          duration: duration || null,
          thumbnail: data.thumbnail,
        },
      });

      cancelAttachment();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setSending(false);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setRecording(null);
    recordingStartRef.current = null;
    setRecordingSeconds(0);
  };

  const startRecording = async (mode) => {
    if (recording) return;
    try {
      const constraints = mode === 'video'
        ? { video: true, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      recordChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const startedAt = Date.now();
      recordingStartRef.current = startedAt;
      setRecordingSeconds(0);

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) recordChunksRef.current.push(evt.data);
      };

      recorder.onstop = () => {
        const endedAt = Date.now();
        const dur = Math.max(0, Math.round((endedAt - startedAt) / 1000));
        const mime = recorder.mimeType || (mode === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(recordChunksRef.current, { type: mime });
        const ext = mode === 'video' ? 'webm' : 'webm';
        const file = new File([blob], `${mode}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`, { type: mime });

        if (attachmentPreview?.previewUrl) {
          URL.revokeObjectURL(attachmentPreview.previewUrl);
        }
        const previewUrl = URL.createObjectURL(blob);
        setAttachmentPreview({ type: mode, file, previewUrl, duration: dur });
      };

      recorder.start();
      setRecording({ mode });
    } catch (err) {
      stopRecording();
      toast.error(mode === 'video' ? 'Impossible d\'accéder à la caméra/micro' : 'Impossible d\'accéder au micro');
    }
  };

  const handleTyping = () => {
    socketRef.current?.emit('typing', { conversationId: id });
    clearTimeout(handleTyping._timer);
    handleTyping._timer = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId: id });
    }, 2000);
  };

  const other = conversation?.participants?.find(p => (p._id || p.id) !== user?.id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {attachmentPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">Aperçu</p>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={cancelAttachment}>Annuler</button>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              {attachmentPreview.type === 'image' && (
                <img src={attachmentPreview.previewUrl} alt="" className="max-w-full rounded-lg" />
              )}
              {attachmentPreview.type === 'audio' && (
                <audio controls className="w-full">
                  <source src={attachmentPreview.previewUrl} type={attachmentPreview.file?.type} />
                </audio>
              )}
              {attachmentPreview.type === 'video' && (
                <video controls className="w-full rounded-lg" style={{ maxHeight: 360 }}>
                  <source src={attachmentPreview.previewUrl} type={attachmentPreview.file?.type} />
                </video>
              )}
              {typeof attachmentPreview.duration === 'number' && attachmentPreview.duration > 0 && (
                <p className="text-xs text-gray-500 mt-2">Durée: {attachmentPreview.duration}s</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={cancelAttachment} disabled={sending}>Annuler</button>
              <button type="button" className="btn-primary" onClick={sendAttachment} disabled={sending}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Link to="/conversations" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {other ? `${other.firstName} ${other.lastName}` : 'Utilisateur'}
          </p>
          {typing && <p className="text-xs text-primary-500">En train d'écrire...</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => {
          const isMine = (msg.senderId?._id || msg.senderId?.id || msg.senderId) === user?.id;
          return (
            <div key={msg._id || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.type === 'text' && <p className="text-sm">{msg.content}</p>}

                {msg.type === 'image' && msg.attachment && (
                  <img src={msg.attachment.url} alt="" className="max-w-full rounded-lg" />
                )}

                {msg.type === 'audio' && msg.attachment && (
                  <audio controls className="max-w-full">
                    <source src={msg.attachment.url} type={msg.attachment.type} />
                  </audio>
                )}

                {msg.type === 'video' && msg.attachment && (
                  <video controls className="max-w-full rounded-lg" style={{ maxHeight: 300 }}>
                    <source src={msg.attachment.url} type={msg.attachment.type} />
                  </video>
                )}

                <p className={`text-xs mt-1 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-4 border-t border-gray-200">
        {recording && (
          <div className="mr-2 flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
            <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
            <span>{recording.mode === 'video' ? 'Vidéo' : 'Vocal'} en cours</span>
            <span className="font-mono">{recordingSeconds}s</span>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,audio/*,video/*" onChange={handleFileUpload} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Paperclip className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => (recording?.mode === 'audio' ? stopRecording() : startRecording('audio'))}
          className={`p-2 rounded-lg hover:bg-gray-100 ${recording?.mode === 'audio' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
          title={recording?.mode === 'audio' ? 'Arrêter l\'enregistrement' : 'Enregistrer un vocal'}
        >
          <Mic className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => (recording?.mode === 'video' ? stopRecording() : startRecording('video'))}
          className={`p-2 rounded-lg hover:bg-gray-100 ${recording?.mode === 'video' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
          title={recording?.mode === 'video' ? 'Arrêter la vidéo' : 'Filmer'}
        >
          <Video className="w-5 h-5" />
        </button>
        <input
          type="text"
          className="input-field flex-1"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
        />
        <button type="submit" disabled={!newMessage.trim() || sending} className="btn-primary !p-2.5">
          <Send className="w-5 h-5" />
        </button>
      </form>

      {recording?.mode === 'video' && (
        <div className="fixed bottom-24 right-4 z-40 w-48 overflow-hidden rounded-xl border border-gray-200 bg-black shadow-lg">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-white/90">
            <span>Enregistrement…</span>
            <span className="font-mono">{recordingSeconds}s</span>
          </div>
          <video ref={liveVideoRef} muted playsInline autoPlay className="h-32 w-full object-cover" />
        </div>
      )}
    </div>
  );
}

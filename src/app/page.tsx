'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Copy, 
  Check, 
  Users, 
  Clock, 
  Navigation, 
  Share2,
  Loader2,
  Radio,
  Shield,
  Eye,
  Crosshair,
  Trash2,
  Map,
  Globe,
  Home,
  LogOut,
  Crown
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Types
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface TrackingSession {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  lastOnline: string | null;
  createdAt: string;
  expiresAt: string | null;
  isOnline: boolean;
  userId?: string;
  lastLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  } | null;
}

interface SessionData {
  id: string;
  name: string;
  token: string;
  expiresAt: string;
  locations: LocationData[];
}

// Dynamic import for Map components (SSR disabled)
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/50">
      <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
    </div>
  ),
});

// Beforeunload Warning Hook
function useBeforeUnloadWarning(isActive: boolean, message: string) {
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, message]);
}

// Google Maps Component
function GoogleMapsView({ latitude, longitude, accuracy }: { latitude: number; longitude: number; accuracy?: number }) {
  return (
    <div className="w-full h-full relative">
      <iframe
        src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${latitude},${longitude}&zoom=17&maptype=roadmap`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0"
      />
      {/* Red marker overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-red-500/30 absolute -inset-0" />
          <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg shadow-red-500/50 relative z-10" />
        </div>
      </div>
      {accuracy && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-white text-xs">
          <span className="text-gray-400">Akurasi:</span> ±{accuracy.toFixed(0)}m
        </div>
      )}
    </div>
  );
}

// TRACKING VIEW COMPONENT (Target/User yang dishare location) - MAP ONLY
function TrackingView({ token }: { token: string }) {
  const hasRequestedRef = useRef(false);
  
  // States
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'error'>('pending');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>('leaflet');

  // Enable beforeunload warning - friendly message
  useBeforeUnloadWarning(true, 'Lokasi sedang dibagikan. Yakin ingin keluar?');

  // Update location to server
  const updateLocation = useCallback(async (latitude: number, longitude: number, accuracy?: number) => {
    try {
      await fetch(`/api/tracking/${token}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, accuracy }),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [token]);

  // Request GPS permission - auto request, no alert
  const requestLocation = useCallback(async () => {
    setLocationStatus('pending');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        };
        setCurrentLocation(newLocation);
        setLocationStatus('granted');
        updateLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      },
      () => {
        setLocationStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [updateLocation]);

  // Watch position for continuous tracking
  useEffect(() => {
    if (locationStatus !== 'granted') return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        };
        setCurrentLocation(newLocation);
        updateLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationStatus, updateLocation]);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/tracking/${token}`);
        const data = await res.json();
        if (data.success) {
          setSessionData(data.session);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    fetchSession();
  }, [token]);

  // Auto request location immediately when session data is loaded - no alert dialog
  useEffect(() => {
    if (!sessionData || hasRequestedRef.current) return;
    
    hasRequestedRef.current = true;
    
    // Use timeout to avoid lint warning about cascading renders
    const timeoutId = setTimeout(() => {
      requestLocation();
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [sessionData, requestLocation]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 cyber-bg scanlines">
      
      {/* Cyberpunk Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-cyan-500/30">
        {/* Row 1: Status & Name */}
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${locationStatus === 'granted' ? 'status-online' : locationStatus === 'pending' ? 'status-pending' : 'status-offline'}`} />
          <span className="text-cyan-400/70 text-xs font-cyber">SHARING:</span>
          <span className="neon-cyan text-sm font-bold truncate font-cyber">{sessionData?.name}</span>
        </div>
        
        {/* Row 2: Time & Map Toggle */}
        <div className="flex items-center justify-between px-4 pb-2">
          {currentLocation && (
            <span className="text-cyan-400/50 text-xs font-mono px-2">
              {formatTime(currentLocation.timestamp)}
            </span>
          )}
          
          {/* Map Provider Toggle - Icons Only */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              onClick={() => setMapProvider('leaflet')}
              size="sm"
              variant={mapProvider === 'leaflet' ? 'default' : 'outline'}
              className={`h-8 w-8 p-0 transition-all duration-300 ${mapProvider === 'leaflet' ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'bg-transparent border-cyan-500/30 text-cyan-500/50 hover:border-cyan-400 hover:text-cyan-400'}`}
              title="Leaflet"
            >
              <Map className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setMapProvider('google')}
              size="sm"
              variant={mapProvider === 'google' ? 'default' : 'outline'}
              className={`h-8 w-8 p-0 transition-all duration-300 ${mapProvider === 'google' ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_15px_rgba(255,0,255,0.5)]' : 'bg-transparent border-fuchsia-500/30 text-fuchsia-500/50 hover:border-fuchsia-400 hover:text-fuchsia-400'}`}
              title="Google Maps"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen Map */}
      <div className="w-full h-full pt-14">
        {currentLocation ? (
          mapProvider === 'leaflet' ? (
            <LeafletMap 
              latitude={currentLocation.latitude} 
              longitude={currentLocation.longitude}
              accuracy={currentLocation.accuracy}
            />
          ) : (
            <GoogleMapsView
              latitude={currentLocation.latitude}
              longitude={currentLocation.longitude}
              accuracy={currentLocation.accuracy}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4">
              <div className="relative inline-block">
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-spin" />
                <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full border-2 border-cyan-500/50" />
              </div>
              <p className="neon-cyan text-lg mb-2 font-cyber">MENGHUBUNGKAN...</p>
              <p className="text-cyan-400/60 text-sm">Izinkan akses lokasi</p>
              {locationStatus === 'denied' && (
                <Button
                  onClick={requestLocation}
                  className="mt-4 cyber-btn"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  COBA LAGI
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Coordinates - Cyberpunk Style */}
      {currentLocation && (
        <div className="fixed bottom-3 left-3 right-3 z-50">
          <div className="cyber-card rounded-lg px-3 py-2 max-w-xs mx-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span className="text-cyan-400/60 text-[10px] font-cyber">KOORDINAT</span>
              </div>
              <div className="text-right">
                <p className="font-mono text-cyan-300 text-[10px]">{currentLocation.latitude.toFixed(6)}</p>
                <p className="font-mono text-fuchsia-300 text-[10px]">{currentLocation.longitude.toFixed(6)}</p>
              </div>
            </div>
            {currentLocation.accuracy && (
              <div className="mt-1 pt-1 border-t border-cyan-500/20 text-center">
                <span className="text-[10px] text-cyan-400/40">AKURASI: </span>
                <span className="text-[10px] text-green-400">±{currentLocation.accuracy.toFixed(0)}m</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// VIEW TRACKING COMPONENT (Dashboard melihat lokasi target)
function ViewTracking({ token }: { token: string }) {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>('leaflet');

  // Fetch session data dengan polling
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/tracking/${token}`);
        const data = await res.json();
        if (data.success) {
          setSessionData(data.session);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching session:', error);
        setIsLoading(false);
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const lastLocation = sessionData?.locations[0];

  if (isLoading) {
    return (
      <div className="min-h-screen cyber-bg scanlines flex items-center justify-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-cyan-500/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cyber-bg scanlines relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl cyber-card">
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-cyber text-xl md:text-2xl font-bold neon-cyan">
                LOCATION MONITOR
              </h1>
              <p className="text-sm text-cyan-400/60">
                TARGET: <span className="neon-magenta font-semibold">{sessionData?.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setMapProvider('leaflet')}
              size="sm"
              variant={mapProvider === 'leaflet' ? 'default' : 'outline'}
              className={`h-8 w-8 p-0 transition-all duration-300 ${mapProvider === 'leaflet' ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'bg-transparent border-cyan-500/30 text-cyan-500/50 hover:border-cyan-400 hover:text-cyan-400'}`}
              title="Leaflet"
            >
              <Map className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setMapProvider('google')}
              size="sm"
              variant={mapProvider === 'google' ? 'default' : 'outline'}
              className={`h-8 w-8 p-0 transition-all duration-300 ${mapProvider === 'google' ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_15px_rgba(255,0,255,0.5)]' : 'bg-transparent border-fuchsia-500/30 text-fuchsia-500/50 hover:border-fuchsia-400 hover:text-fuchsia-400'}`}
              title="Google Maps"
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => router.push('/')}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 cyber-card border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Dashboard"
            >
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Status Card */}
          <div className="space-y-6">
            {/* Target Status Card */}
            <Card className="cyber-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber text-lg neon-cyan">
                  <Radio className={`w-5 h-5 ${lastLocation ? 'text-green-400' : 'text-gray-500'}`} />
                  STATUS TARGET
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastLocation ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                      <div className="w-3 h-3 rounded-full status-online" />
                      <span className="font-semibold text-green-400 font-cyber">ONLINE</span>
                    </div>

                    {/* Location */}
                    <div className="p-4 rounded-xl holographic border border-cyan-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Crosshair className="w-4 h-4 text-fuchsia-400" />
                        <span className="font-semibold text-sm text-cyan-400">LOKASI</span>
                      </div>
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-cyan-400/60">LAT</span>
                          <span className="text-cyan-300">{lastLocation.latitude.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyan-400/60">LNG</span>
                          <span className="text-fuchsia-300">{lastLocation.longitude.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyan-400/60">UPDATE</span>
                          <span className="text-green-400">{formatTime(lastLocation.timestamp)}</span>
                        </div>
                        {lastLocation.accuracy && (
                          <div className="flex justify-between">
                            <span className="text-cyan-400/60">AKURASI</span>
                            <span className="text-yellow-400">±{lastLocation.accuracy.toFixed(0)}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                      <Radio className="w-6 h-6 text-yellow-400" />
                    </div>
                    <p className="text-yellow-400 font-semibold text-sm font-cyber">MENUNGGU TARGET...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Card */}
            <Card className="cyber-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-cyber text-lg neon-magenta">
                  <MapPin className="w-5 h-5 text-fuchsia-400" />
                  PETA LOKASI
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastLocation ? (
                  <div className="map-container aspect-video w-full rounded-xl overflow-hidden">
                    {mapProvider === 'leaflet' ? (
                      <LeafletMap 
                        latitude={lastLocation.latitude} 
                        longitude={lastLocation.longitude}
                        accuracy={lastLocation.accuracy}
                      />
                    ) : (
                      <GoogleMapsView
                        latitude={lastLocation.latitude}
                        longitude={lastLocation.longitude}
                        accuracy={lastLocation.accuracy}
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-black/30 rounded-xl border border-cyan-500/20">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
                      <p className="text-cyan-400/60 font-cyber">MENUNGGU LOKASI...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-cyan-400/40 text-sm font-cyber">
          <Shield className="w-4 h-4 inline mr-2" />
          CONSENT-BASED LOCATION TRACKING
        </footer>
      </div>
    </div>
  );
}

// DASHBOARD COMPONENT
function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [userName, setUserName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Fetch sessions dengan polling
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/tracking/sessions');
        const data = await res.json();
        if (data.success) {
          setSessions(data.sessions);
          setIsAdminUser(data.user?.isAdmin || false);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleGenerateLink = async () => {
    if (!userName.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/tracking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedToken(data.session.token);
        setUserName('');
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error generating link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const shareLink = `${window.location.origin}?token=${token}`;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async (token: string) => {
    const shareLink = `${window.location.origin}?token=${token}`;
    if (navigator.share) {
      await navigator.share({
        title: 'Bagikan Lokasi',
        text: 'Kirim lokasi kamu yuk!',
        url: shareLink,
      });
    } else {
      handleCopyLink(token);
    }
  };

  const handleDeleteSession = async (token: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tracking/${token}/delete`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.token !== token));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen cyber-bg scanlines relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl cyber-card">
              <Navigation className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-cyber text-xl md:text-2xl font-bold neon-cyan">
                LOCATION TRACKER
              </h1>
              <p className="text-sm text-cyan-400/60">CONSENT-BASED GPS TRACKING</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="cyber-card border-cyan-500/30 text-cyan-300 font-cyber">
              <Radio className="w-3 h-3 mr-1 status-online" />
              {sessions.length} ACTIVE
            </Badge>
            
            {/* User Info */}
            <div className="flex items-center gap-2">
              {isAdminUser && (
                <Badge className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-cyber">
                  <Crown className="w-3 h-3 mr-1" />
                  ADMIN
                </Badge>
              )}
              <Avatar className="w-8 h-8 border-2 border-cyan-500/30">
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={handleLogout}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-400"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <Tabs defaultValue="create" className="flex-1">
          <TabsList className="cyber-card mb-6">
            <TabsTrigger value="create" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-cyan-300 font-cyber">
              <Share2 className="w-4 h-4 mr-2" />
              BUAT LINK
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-cyan-300 font-cyber">
              <Users className="w-4 h-4 mr-2" />
              RIWAYAT
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card className="cyber-card max-w-xl mx-auto">
              <CardHeader>
                <CardTitle className="font-cyber text-xl flex items-center gap-2 neon-magenta">
                  <MapPin className="w-5 h-5 text-fuchsia-400" />
                  GENERATE TRACKING LINK
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-cyan-400/60 font-cyber">NAMA TARGET</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Contoh: John Doe"
                    className="cyber-input font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateLink()}
                  />
                </div>

                <Button
                  onClick={handleGenerateLink}
                  disabled={!userName.trim() || isLoading}
                  className="w-full cyber-btn py-6 text-lg font-cyber"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5 mr-2" />
                  )}
                  GENERATE LINK
                </Button>

                {/* Generated Link */}
                {generatedToken && (
                  <div className="mt-6 p-4 rounded-xl holographic border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-green-400 font-cyber">LINK BERHASIL DIBUAT!</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCopyLink(generatedToken)}
                          size="sm"
                          variant="outline"
                          className="cyber-btn h-8 w-8 p-0"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleShareLink(generatedToken)}
                          size="sm"
                          variant="outline"
                          className="cyber-btn h-8 w-8 p-0"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-black/50 rounded-lg font-mono text-xs text-cyan-300 break-all border border-cyan-500/20">
                      {typeof window !== 'undefined' ? `${window.location.origin}?token=${generatedToken}` : `...?token=${generatedToken}`}
                    </div>
                    <p className="text-xs text-cyan-400/40 mt-2 font-cyber">
                      KIRIM LINK INI KE TARGET UNTUK MEMULAI TRACKING
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full cyber-card flex items-center justify-center">
                  <Users className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-cyan-400/60 font-cyber">BELUM ADA TARGET TRACKING</p>
                <p className="text-sm text-cyan-400/40 mt-1">Buat link untuk memulai</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cyber-card"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${session.isOnline ? 'status-online' : 'status-offline'}`} />
                          <div>
                            <h3 className="font-semibold text-cyan-300 font-cyber">{session.name}</h3>
                            <p className="text-xs text-cyan-400/50 font-mono">
                              {formatDate(session.createdAt)} • {formatTime(session.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Location Preview */}
                      {session.lastLocation && (
                        <div className="mb-3 p-2 rounded-lg bg-black/30 text-xs font-mono border border-cyan-500/20">
                          <div className="flex justify-between">
                            <span className="text-cyan-400/50">LAT:</span>
                            <span className="text-cyan-300">{session.lastLocation.latitude.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400/50">LNG:</span>
                            <span className="text-fuchsia-300">{session.lastLocation.longitude.toFixed(6)}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => router.push(`?view=${session.token}`)}
                          size="sm"
                          className="flex-1 cyber-btn"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          LIHAT
                        </Button>
                        <Button
                          onClick={() => handleCopyLink(session.token)}
                          size="sm"
                          variant="outline"
                          className="cyber-btn h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(session.token)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="cyber-card max-w-sm w-full">
              <CardHeader>
                <CardTitle className="text-lg text-red-400 font-cyber">HAPUS TARGET?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-cyan-400/60">
                  Data tracking untuk target ini akan dihapus permanen.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setDeleteConfirm(null)}
                    variant="outline"
                    className="flex-1 cyber-btn"
                  >
                    BATAL
                  </Button>
                  <Button
                    onClick={() => handleDeleteSession(deleteConfirm)}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600/30 border border-red-500/50 text-red-400 hover:bg-red-500/30 font-cyber"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'HAPUS'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-6 text-center text-cyan-400/40 text-sm font-cyber">
          <Shield className="w-4 h-4 inline mr-2" />
          CONSENT-BASED LOCATION TRACKING
        </footer>
      </div>
    </div>
  );
}

// Auth Wrapper Component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen cyber-bg scanlines flex items-center justify-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-cyan-500/50" />
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return null;
}

// MAIN PAGE COMPONENT
function PageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const viewToken = searchParams.get('view');

  // If token param exists, show tracking view (for target - no auth required)
  if (token) {
    return <TrackingView token={token} />;
  }

  // If view param exists, show view tracking (requires auth)
  if (viewToken) {
    return (
      <AuthWrapper>
        <ViewTracking token={viewToken} />
      </AuthWrapper>
    );
  }

  // Default: show dashboard (requires auth)
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen cyber-bg scanlines flex items-center justify-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-cyan-500/50" />
        </div>
      </div>
    }>
      <PageContent />
    </Suspense>
  );
}

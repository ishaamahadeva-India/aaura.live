'use client';

import React, { useState, useTransition } from 'react';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  Timestamp,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';
import { isSuperAdmin } from '@/lib/admin';

/**
 * Convert IST date/time string to UTC Date object
 * IST is UTC+5:30
 * 
 * This function takes a date and time string (assumed to be in IST)
 * and converts it to a UTC Date object for storage in Firestore.
 */
function istToUTC(dateStr: string, timeStr: string): Date {
  // Parse the date and time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // IST offset: +5:30 hours = +330 minutes
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  
  // Calculate total minutes from midnight
  const totalInputMinutes = hours * 60 + minutes;
  
  // Convert to UTC by subtracting IST offset
  let utcTotalMinutes = totalInputMinutes - IST_OFFSET_MINUTES;
  
  // Handle negative (previous day)
  let utcDay = day;
  if (utcTotalMinutes < 0) {
    utcTotalMinutes += 24 * 60; // Add 24 hours
    utcDay -= 1;
  }
  
  const utcHours = Math.floor(utcTotalMinutes / 60);
  const utcMins = utcTotalMinutes % 60;
  
  // Create UTC date
  // Note: Date.UTC handles month as 0-indexed, so month - 1
  return new Date(Date.UTC(year, month - 1, utcDay, utcHours, utcMins, 0));
}

/**
 * Convert UTC Date to IST date/time strings for display
 * Returns { date: 'YYYY-MM-DD', time: 'HH:mm' } in IST
 */
function utcToIST(utcDate: Date): { date: string; time: string } {
  // Format date in IST timezone
  const istDateStr = utcDate.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse the formatted string (format: "DD/MM/YYYY, HH:MM")
  const [datePart, timePart] = istDateStr.split(', ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes] = timePart.split(':');
  
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

export default function SamuhikaaAdminPage() {
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [isCreating, startCreateTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SamuhikaaEvent | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [mantra, setMantra] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('11');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [showParticipantCount, setShowParticipantCount] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Fetch all events
  const eventsQuery = React.useMemo(() => {
    if (!db) return null;
    try {
      // Try with orderBy first, but it might require an index
      return query(
        collection(db, 'samuhikaa_events'),
        orderBy('scheduledAt', 'desc')
      );
    } catch (err) {
      console.warn('Query with orderBy failed, trying without:', err);
      // Fallback: query without orderBy (we'll sort client-side)
      return collection(db, 'samuhikaa_events');
    }
  }, [db]);

  const [snapshot, loading, error] = useCollection(eventsQuery);

  // Debug logging
  React.useEffect(() => {
    if (snapshot) {
      console.log('Admin - Total events fetched:', snapshot.docs.length);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Admin Event:', {
          id: doc.id,
          title: data.title,
          scheduledAt: data.scheduledAt,
          isActive: data.isActive,
        });
      });
    }
    if (error) {
      console.error('Admin - Query error:', error);
    }
  }, [snapshot, error]);

  const events: SamuhikaaEvent[] = React.useMemo(() => {
    if (!snapshot) return [];
    const mappedEvents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        mantra: data.mantra,
        description: data.description,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes || 5,
        recurrence: data.recurrence || 'none',
        createdBy: data.createdBy,
        isActive: data.isActive !== false,
        showParticipantCount: data.showParticipantCount !== false,
        createdAt: data.createdAt,
      } as SamuhikaaEvent;
    });
    
    // Sort by scheduledAt descending (newest first) - client-side sort as fallback
    return mappedEvents.sort((a, b) => {
      const aTime = a.scheduledAt instanceof Timestamp 
        ? a.scheduledAt.toMillis() 
        : a.scheduledAt instanceof Date
        ? a.scheduledAt.getTime()
        : new Date(a.scheduledAt).getTime();
      const bTime = b.scheduledAt instanceof Timestamp 
        ? b.scheduledAt.toMillis() 
        : b.scheduledAt instanceof Date
        ? b.scheduledAt.getTime()
        : new Date(b.scheduledAt).getTime();
      return bTime - aTime; // Descending order
    });
  }, [snapshot]);

  // Check if user is super admin (only smr@aaura.com)
  const isSuperAdminUser = isSuperAdmin(user);

  // Debug logging for admin check
  React.useEffect(() => {
    if (user) {
      console.log('Super Admin check debug:', {
        uid: user.uid,
        email: user.email,
        isSuperAdmin: isSuperAdminUser,
        expectedUID: '9RwsoEEkWPR3Wpv6wKZmhos1xTG2',
        expectedEmail: 'smr@aaura.com',
      });
    }
  }, [user, isSuperAdminUser]);

  const resetForm = () => {
    setTitle('');
    setMantra('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setDurationMinutes('11');
    setRecurrence('none');
    setShowParticipantCount(true);
    setIsActive(true);
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!db || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database or user not available. Please refresh the page.',
      });
      return;
    }

    if (!title || !mantra || !scheduledDate || !scheduledTime) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    startCreateTransition(async () => {
      try {
        if (!db) {
          throw new Error('Database not initialized. Please refresh the page.');
        }
        
        if (!user) {
          throw new Error('User not authenticated. Please log in again.');
        }

        // Parse date and time - handle IST timezone properly
        const dateStr = scheduledDate; // YYYY-MM-DD
        const timeStr = scheduledTime; // HH:MM (in IST)
        
        if (!dateStr || !timeStr) {
          throw new Error('Please fill in both date and time.');
        }

        // Convert IST time to UTC for storage
        const scheduledDateTime = istToUTC(dateStr, timeStr);
        
        if (isNaN(scheduledDateTime.getTime())) {
          throw new Error(`Invalid date or time: ${dateStr} ${timeStr}. Please check your input.`);
        }
        
        // Log the date in both UTC and IST for debugging
        console.log('Creating event:', {
          inputDate: dateStr,
          inputTime: timeStr,
          inputTimezone: 'IST (UTC+5:30)',
          storedAsUTC: scheduledDateTime.toISOString(),
          displayedAsIST: scheduledDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          timestamp: scheduledDateTime.getTime(),
        });
        
        const scheduledTimestamp = Timestamp.fromDate(scheduledDateTime);

        const eventData = {
          title: title.trim(),
          mantra: mantra.trim(),
          description: description.trim() || null,
          scheduledAt: scheduledTimestamp,
          durationMinutes: parseInt(durationMinutes),
          recurrence: recurrence,
          createdBy: user.uid,
          isActive: isActive,
          showParticipantCount: showParticipantCount,
          createdAt: editingEvent ? editingEvent.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (editingEvent) {
          // Update existing event
          const eventRef = doc(db, 'samuhikaa_events', editingEvent.id);
          await updateDoc(eventRef, {
            ...eventData,
            createdAt: editingEvent.createdAt, // Preserve original creation time
          });
          toast({
            title: 'Event updated',
            description: 'Samuhikaa event has been updated successfully.',
          });
        } else {
          // Create new event
          await addDoc(collection(db, 'samuhikaa_events'), eventData);
          toast({
            title: 'Event created',
            description: 'New Samuhikaa event has been created successfully.',
          });
        }

        resetForm();
      } catch (error: any) {
        console.error('Error creating/updating event:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
        
        let errorMessage = error.message || 'Failed to create/update event.';
        
        // Provide more specific error messages
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please ensure you are logged in as an admin user with @aaura.com email.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Firestore is temporarily unavailable. Please try again in a moment.';
        } else if (error.message?.includes('Missing or insufficient permissions')) {
          errorMessage = 'Missing permissions. Please check Firestore rules and ensure you are an admin.';
        }
        
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    });
  };

  const handleEdit = (event: SamuhikaaEvent) => {
    const scheduledAt = event.scheduledAt instanceof Timestamp 
      ? event.scheduledAt.toDate() 
      : new Date(event.scheduledAt);
    
    // Convert UTC to IST for display
    const istDateTime = utcToIST(scheduledAt);
    
    setTitle(event.title);
    setMantra(event.mantra);
    setDescription(event.description || '');
    setScheduledDate(istDateTime.date);
    setScheduledTime(istDateTime.time);
    setDurationMinutes(event.durationMinutes.toString());
    setRecurrence(event.recurrence || 'none');
    setShowParticipantCount(event.showParticipantCount);
    setIsActive(event.isActive);
    setEditingEvent(event);
    setShowForm(true);
  };

  // Show loading while checking user
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-lg font-semibold text-destructive mb-2">Super Admin access required</p>
        <p className="text-muted-foreground mb-4">
          You do not have permission to access this page.
        </p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Your email: <strong>{user.email || 'N/A'}</strong></p>
          <p>Your UID: <strong>{user.uid}</strong></p>
          <p className="mt-4 text-xs">
            Only super administrator (smr@aaura.com) can manage Samuhikaa events.
          </p>
          <p className="text-xs mt-2">
            Check the browser console (F12) for detailed admin check information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Samuhikaa Admin</h1>
          <p className="text-muted-foreground">Manage collective chanting events</p>
        </div>
        <Button 
          onClick={() => { 
            if (showForm) {
              setShowForm(false);
              setEditingEvent(null);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="shrink-0"
          variant={showForm ? "outline" : "default"}
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Close Form' : 'Create Event'}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AUM NAMASHIVAYA Samuhikaa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mantra">Mantra *</Label>
              <Input
                id="mantra"
                value={mantra}
                onChange={(e) => setMantra(e.target.value)}
                placeholder="AUM NAMASHIVAYA"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Scheduled Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Scheduled Time * (IST)</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter time in IST (Indian Standard Time)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="11">11 minutes</SelectItem>
                    <SelectItem value="21">21 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as 'none' | 'daily' | 'weekly' | 'monthly')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showCount"
                  checked={showParticipantCount}
                  onCheckedChange={setShowParticipantCount}
                />
                <Label htmlFor="showCount">Show participant count</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingEvent ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingEvent ? 'Update Event' : 'Create Event'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }} 
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">All Events</h2>
        {error ? (
          <div className="text-center py-12">
            <p className="text-lg font-semibold text-destructive mb-2">Error loading events</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {error.message?.includes('index') 
                ? 'Firestore index may be missing. Events will still load, but may not be sorted.'
                : 'Please refresh the page or check the console for details.'}
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No events created yet.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const scheduledAt = event.scheduledAt instanceof Timestamp 
                ? event.scheduledAt.toDate() 
                : new Date(event.scheduledAt);
              
              return (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{event.title}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(scheduledAt, 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(scheduledAt, 'h:mm a')} • {event.durationMinutes} min
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={event.isActive ? 'default' : 'secondary'}>
                          {event.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-primary">{event.mantra}</p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Recurrence: {event.recurrence || 'None'}</span>
                        <span>Show count: {event.showParticipantCount ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}


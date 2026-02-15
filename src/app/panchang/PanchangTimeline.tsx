
'use client';

import type { Panchang } from "@/lib/panchang";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sunrise, Sunset, Moon, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Helper function to convert HH:MM time string to a percentage of the day
const timeToPercentage = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100;
};

// Helper function to convert time range to percentage and width
const timeRangeToStyle = (range: string) => {
    const [start, end] = range.split(' - ').map(t => t.replace(' AM', '').replace(' PM', ''));
    
    let [startH, startM] = start.split(':').map(Number);
    if (range.includes('PM') && startH < 12) startH += 12;

    let [endH, endM] = end.split(':').map(Number);
    if (range.includes('PM') && endH < 12) endH += 12;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const left = (startMinutes / (24 * 60)) * 100;
    const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
}

export function PanchangTimeline({ panchang, currentTime = new Date() }: { panchang: Panchang; currentTime?: Date }) {

    const events = [
        { time: panchang.sunrise.replace(' AM',''), icon: Sunrise, color: 'text-orange-400', label: 'Sunrise' },
        { time: panchang.sunset.replace(' PM',''), icon: Sunset, color: 'text-indigo-400', label: 'Sunset' },
        { time: panchang.moonrise.replace(' PM',''), icon: Moon, color: 'text-gray-400', label: 'Moonrise' },
    ];

    const inauspiciousPeriods = [
        { label: 'Rahu Kalam', range: panchang.rahukalam, color: 'bg-red-500/30 border-red-500/50' },
        { label: 'Yama Gandam', range: panchang.yamaGandam, color: 'bg-orange-500/30 border-orange-500/50' },
        { label: 'Gulika Kalam', range: panchang.gulikaKalam, color: 'bg-red-600/30 border-red-600/50' },
    ];

    // Check if current time is in any period
    const isTimeInRange = (range: string): boolean => {
        const [start, end] = range.split(' - ');
        const parseTime = (timeStr: string): Date => {
            const [time, period] = timeStr.trim().split(' ');
            const [hour, min] = time.split(':').map(Number);
            const date = new Date(currentTime);
            const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
            date.setHours(hour24, min, 0, 0);
            return date;
        };
        
        try {
            const startTime = parseTime(start);
            const endTime = parseTime(end);
            return currentTime >= startTime && currentTime <= endTime;
        } catch {
            return false;
        }
    };
    
    const getHourLabel = (hour: number) => {
        if (hour === 0) return '12AM';
        if (hour === 12) return '12PM';
        return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
    };

    // Current time indicator
    const currentTimePercentage = timeToPercentage(`${currentTime.getHours()}:${currentTime.getMinutes()}`);

    return (
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Today's Timeline</span>
                    <Badge variant="secondary" className="text-xs">
                        Live • {format(currentTime, 'hh:mm a')}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 px-8">
                <div className="relative h-6 bg-secondary/50 rounded-full border border-border">
                    {/* Inauspicious Periods */}
                    {inauspiciousPeriods.map(period => {
                        const style = timeRangeToStyle(period.range);
                        const isActive = isTimeInRange(period.range);
                        return (
                             <div key={period.label}
                                className={`absolute h-6 top-0 rounded-full border-y-2 ${period.color} ${isActive ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
                                style={{ left: style.left, width: style.width }}
                                title={`${period.label}: ${period.range}${isActive ? ' (Active Now)' : ''}`}
                             >
                                {isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-bold text-red-600">{period.label}</span>
                                    </div>
                                )}
                             </div>
                        )
                    })}

                    {/* Current Time Indicator */}
                    <div 
                        className="absolute top-0 h-6 w-0.5 bg-primary z-10" 
                        style={{ left: `${currentTimePercentage}%` }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                    </div>

                    {/* Time Events */}
                    {events.map((event, index) => {
                        let eventTime = event.time;
                        let [h, m] = eventTime.split(':').map(Number);
                        if(event.label.includes('Sunset') || (event.label.includes('Moonrise') && h < 12)) {
                            h += 12;
                        }
                        const leftPercentage = timeToPercentage(`${h}:${m}`);

                        return (
                            <div key={index} className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `${leftPercentage}%` }}>
                               <div className="relative group">
                                     <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background rounded-full border-2 border-primary"></div>
                                     <event.icon className={`h-6 w-6 -translate-x-1/2 ${event.color} drop-shadow-lg`} />
                                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-card p-2 rounded-md shadow-lg border border-border text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                        <p className="font-bold">{event.label}</p>
                                        <p>{event.time} {event.label === 'Sunrise' ? 'AM' : 'PM'}</p>
                                    </div>
                               </div>
                            </div>
                        )
                    })}
                </div>
                 {/* Hour Markers */}
                 <div className="relative w-full flex justify-between mt-4 text-xs text-muted-foreground">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="text-muted-foreground/50">|</span>
                            <span className="mt-1">{getHourLabel(i * 3)}</span>
                        </div>
                    ))}
                 </div>
                 
                 {/* Legend */}
                 <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500/30 rounded"></div>
                        <span className="text-muted-foreground">Inauspicious Periods</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground">Current Time</span>
                    </div>
                 </div>
            </CardContent>
        </Card>
    )
}

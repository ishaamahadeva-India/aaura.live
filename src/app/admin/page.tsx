
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, FileCheck, DollarSign, UserPlus, Loader2, Shield, TrendingUp, Flower, Activity, BarChart3, Eye, Search, Download, ArrowUpDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell } from "recharts";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { useFirestore, useAuth } from "@/lib/firebase/provider";
import { useAuthState } from "react-firebase-hooks/auth";
import { useMemo } from "react";
import { subMonths, format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { isSuperAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';

const chartData = [
  { month: "January", users: 186 },
  { month: "February", users: 305 },
  { month: "March", users: 237 },
  { month: "April", users: 73 },
  { month: "May", users: 209 },
  { month: "June", users: 214 },
]

const chartConfig = {
  users: {
    label: "New Users",
    color: "hsl(var(--primary))",
  },
}

export default function AdminDashboardPage() {
  const db = useFirestore();
  const auth = useAuth();
  const [user, loadingAuth] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  
  const [users, usersLoading] = useCollectionData(collection(db, 'users'));
  const [pendingMedia, pendingLoading] = useCollectionData(query(collection(db, 'media'), where('status', '==', 'pending')));
  const [transactions, transactionsLoading] = useCollectionData(collection(db, 'transactions'));
  const [orders, ordersLoading] = useCollectionData(collection(db, 'orders'));
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const superAdmin = isSuperAdmin(user);
  
  const totalUsers = users?.length || 0;
  const pendingCount = pendingMedia?.length || 0;

  // Calculate Support Aura amounts by activity
  const supportAuraStats = useMemo(() => {
    if (!transactions) return { total: 0, byActivity: {}, byType: {} };
    
    let total = 0;
    const byActivity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    transactions.forEach((transaction: any) => {
      if (transaction.status === 'completed' && transaction.totalAmount) {
        total += transaction.totalAmount;
        
        // Group by activity/item type
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach((item: any) => {
            const activityName = item.name || item.planId || 'Unknown';
            byActivity[activityName] = (byActivity[activityName] || 0) + (item.amount * (item.quantity || 1));
            
            const type = item.type || 'donation';
            byType[type] = (byType[type] || 0) + (item.amount * (item.quantity || 1));
          });
        }
      }
    });
    
    return { total, byActivity, byType };
  }, [transactions]);

  // Calculate sales from orders
  const salesStats = useMemo(() => {
    if (!orders) return { total: 0, count: 0 };
    
    let total = 0;
    let count = 0;
    
    orders.forEach((order: any) => {
      if (order.status === 'paid' && order.totalAmount) {
        total += order.totalAmount;
        count++;
      }
    });
    
    return { total, count };
  }, [orders]);

  const newUsersThisMonth = useMemo(() => {
    if (!users) return 0;
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return users.filter(user => {
        const creationDate = user.creationTimestamp?.toDate();
        return creationDate && creationDate >= start && creationDate <= end;
    }).length;
  }, [users]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = [...users];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u: any) => {
        const name = (u.fullName || u.displayName || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        return name.includes(query) || email.includes(query) || username.includes(query);
      });
    }
    
    // Sort
    filtered.sort((a: any, b: any) => {
      if (sortBy === 'newest') {
        const dateA = a.creationTimestamp?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.creationTimestamp?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      } else if (sortBy === 'oldest') {
        const dateA = a.creationTimestamp?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.creationTimestamp?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateA.getTime() - dateB.getTime();
      } else {
        const nameA = (a.fullName || a.displayName || '').toLowerCase();
        const nameB = (b.fullName || b.displayName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
    });
    
    return filtered;
  }, [users, searchQuery, sortBy]);

  // Activity-wise chart data
  const activityChartData = useMemo(() => {
    const entries = Object.entries(supportAuraStats.byActivity);
    return entries
      .map(([name, amount]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [supportAuraStats.byActivity]);

  // Monthly revenue chart data
  const monthlyRevenueData = useMemo(() => {
    if (!transactions) return [];
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      let revenue = 0;
      transactions.forEach((transaction: any) => {
        if (transaction.status === 'completed' && transaction.totalAmount) {
          const createdAt = transaction.createdAt?.toDate?.() || transaction.createdAt;
          if (createdAt && createdAt >= monthStart && createdAt <= monthEnd) {
            revenue += transaction.totalAmount;
          }
        }
      });
      
      months.push({
        month: format(date, 'MMM'),
        revenue: Math.round(revenue),
      });
    }
    
    return months;
  }, [transactions]);

  if (!isClient || loadingAuth) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You must be logged in to access the admin dashboard.</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!superAdmin) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-2">You do not have permission to access the admin dashboard.</p>
          <p className="text-sm text-muted-foreground">Only super administrators can access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-left mb-8">
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">
              Super Admin Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Comprehensive overview of platform activity, support Aura contributions, and user management.
          </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {usersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold text-primary">{totalUsers}</div>}
            <p className="text-xs text-muted-foreground mt-1">+{newUsersThisMonth} this month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Aura</CardTitle>
            <Flower className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {transactionsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <div className="text-2xl font-bold text-primary">₹{supportAuraStats.total.toLocaleString('en-IN')}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total contributions</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <div className="text-2xl font-bold text-primary">₹{salesStats.total.toLocaleString('en-IN')}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{salesStats.count} orders</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Pending</CardTitle>
            <FileCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {pendingLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold text-primary">{pendingCount}</div>}
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="support-aura">Support Aura</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Support Aura + Sales over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
                  <AreaChart data={monthlyRevenueData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="revenue" type="natural" fill="var(--primary)" fillOpacity={0.4} stroke="var(--primary)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Support Aura by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Support Aura by Type</CardTitle>
                <CardDescription>Breakdown of contribution types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(supportAuraStats.byType).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                      <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="secondary" className="font-bold">
                        ₹{amount.toLocaleString('en-IN')}
                      </Badge>
                    </div>
                  ))}
                  {Object.keys(supportAuraStats.byType).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No contributions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Support Aura Tab */}
        <TabsContent value="support-aura" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Aura Activity Breakdown</CardTitle>
              <CardDescription>Detailed breakdown of contributions by activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ amount: { label: "Amount", color: "hsl(var(--primary))" } }} className="h-[400px] w-full">
                <BarChart data={activityChartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={100} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Activity-wise list */}
          <Card>
            <CardHeader>
              <CardTitle>Top Contributing Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(supportAuraStats.byActivity)
                  .sort(([, a], [, b]) => b - a)
                  .map(([activity, amount]) => (
                    <div key={activity} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Flower className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity}</p>
                          <p className="text-xs text-muted-foreground">
                            {transactions?.filter((t: any) => 
                              t.items?.some((item: any) => (item.name || item.planId) === activity)
                            ).length || 0} contributions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">₹{amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">
                          {supportAuraStats.total > 0 ? ((amount / supportAuraStats.total) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users List</CardTitle>
                  <CardDescription>Manage and view all platform users</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-40">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user: any) => {
                          const createdAt = user.creationTimestamp?.toDate?.() || user.createdAt?.toDate?.() || new Date();
                          return (
                            <TableRow key={user.id || user.uid}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.photoURL} />
                                    <AvatarFallback>{user.fullName?.charAt(0) || user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.fullName || user.displayName || 'Anonymous'}</p>
                                    {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{user.email || 'N/A'}</TableCell>
                              <TableCell>{user.mobile || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{format(createdAt, 'MMM d, yyyy')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.profileComplete ? "default" : "secondary"}>
                                  {user.profileComplete ? "Complete" : "Incomplete"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/profile/${user.id || user.uid}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="users" type="natural" fill="var(--primary)" fillOpacity={0.4} stroke="var(--primary)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Total Contributions</p>
                    <p className="text-2xl font-bold">{transactions?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{orders?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Pending Content</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </main>
  );
}

    
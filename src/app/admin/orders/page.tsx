
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { isSuperAdmin } from '@/lib/admin';
import { Loader2, Package, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';

const statusColors = {
  created: "bg-blue-500",
  paid: "bg-yellow-500",
  shipped: "bg-green-500",
  delivered: "bg-purple-500",
  cancelled: "bg-red-500",
};


export default function AdminOrdersPage() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Check if user is super admin
  const superAdmin = isSuperAdmin(user);

  const ordersQuery = useMemo(() => 
    db ? query(collection(db, 'orders'), orderBy('createdAt', 'desc')) : undefined,
    [db]
  );
  const [orders, loadingOrders] = useCollectionData(ordersQuery, { idField: 'id' });

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!db) return;
    setUpdatingStatus(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Status Updated", description: `Order ${orderId} has been marked as ${newStatus}.` });
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update the order status." });
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (!isClient || loadingAuth) {
    return <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex justify-center items-center"><Loader2 className="h-16 w-16 animate-spin" /></main>;
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You must be logged in to view this page.</p>
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
          <p className="text-muted-foreground mb-2">You do not have permission to view this page.</p>
          <p className="text-sm text-muted-foreground">Only super administrators can access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
      <div className="text-left mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
          Order Management
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          View and manage all customer orders from the marketplace.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-primary hover:underline">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.userId.slice(0,8)}...</TableCell>
                  <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                      disabled={updatingStatus === order.id}
                    >
                      <SelectTrigger className="w-[180px]">
                         {updatingStatus === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Set status" />}
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(statusColors).map(status => (
                            <SelectItem key={status} value={status}>
                                <span className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${statusColors[status as keyof typeof statusColors]}`} />
                                    <span className="capitalize">{status}</span>
                                </span>
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">No orders found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

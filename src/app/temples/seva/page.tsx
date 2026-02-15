
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, Building, Wrench } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportDialog } from '@/components/SupportDialog';

function RenovationProjects() {
    const db = useFirestore();
    const requestsQuery = query(collection(db, 'temple_renovation_requests'), where('status', '==', 'approved'));
    const [snapshot, loading] = useCollection(requestsQuery);
    const projects = snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Temple Renovation Projects</h2>
                <Button asChild>
                    <Link href="/temples/seva/renovate">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Renovation Request
                    </Link>
                </Button>
            </div>
            {loading ? (
                <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map(project => (
                        <Card key={project.id}>
                            <div className="relative aspect-video">
                                <Image src={project.imageUrl || `https://picsum.photos/seed/${project.id}/600/400`} alt={project.templeName} fill className="object-cover rounded-t-lg" />
                            </div>
                            <CardHeader>
                                <CardTitle>{project.templeName}</CardTitle>
                                <CardDescription>{project.location}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                                <div className="mt-4">
                                  <p className="text-sm font-semibold">Funding Goal: <span className="text-primary">₹{project.totalGoal.toLocaleString()}</span></p>
                                </div>
                                <Badge className="mt-2">{project.progressStatus}</Badge>
                            </CardContent>
                            <CardFooter>
                                <SupportDialog />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">No active renovation projects.</p>
            )}
        </div>
    );
}

function MaintenanceFunds() {
    const db = useFirestore();
    const fundsQuery = query(collection(db, 'temple_maintenance_funds'));
    const [snapshot, loading] = useCollection(fundsQuery);
    const funds = snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Monthly Maintenance Funds</h2>
                <Button asChild>
                    <Link href="/temples/seva/maintain">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Maintenance Fund
                    </Link>
                </Button>
            </div>
             {loading ? (
                <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : funds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {funds.map(fund => {
                        const progress = fund.monthlyTarget > 0 ? (fund.totalCollected / fund.monthlyTarget) * 100 : 0;
                        return (
                            <Card key={fund.id}>
                                <CardHeader>
                                    <CardTitle>Maintenance for Temple #{fund.templeId.slice(0, 6)}</CardTitle>
                                    <CardDescription>{fund.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-semibold">₹{fund.totalCollected.toLocaleString()}</span>
                                        <span className="text-muted-foreground">raised of ₹{fund.monthlyTarget.toLocaleString()}</span>
                                    </div>
                                    <Progress value={progress} className="mt-2" />
                                </CardContent>
                                <CardFooter>
                                    <SupportDialog />
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">No active maintenance funds.</p>
            )}
        </div>
    );
}


export default function TempleSevaPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">Temple Seva</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Support the preservation and upkeep of our sacred temples. Your contribution makes a difference.
        </p>
      </div>

       <Tabs defaultValue="renovation" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
          <TabsTrigger value="renovation"><Wrench className="mr-2 h-4 w-4" /> Renovation Projects</TabsTrigger>
          <TabsTrigger value="maintenance"><Building className="mr-2 h-4 w-4" /> Maintenance Funds</TabsTrigger>
        </TabsList>
        <TabsContent value="renovation" className="mt-6">
            <RenovationProjects />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
            <MaintenanceFunds />
        </TabsContent>
      </Tabs>
    </main>
  );
}

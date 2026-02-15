
import { useEffect, useState } from "react";
import { onSnapshot, Query, QuerySnapshot } from "firebase/firestore";

export function useFirestoreQuery<T>(query: Query<T>) {
  const [data, setData] = useState<QuerySnapshot<T> | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }
    const unsub = onSnapshot(query, (snap) => setData(snap));
    return () => unsub();
  }, [query]);

  return data;
}

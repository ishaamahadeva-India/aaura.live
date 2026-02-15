

"use client";
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export interface SearchBarProps {
    onSearch: (query: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            onSearch(query);
        }, 300); // 300ms debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [query, onSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder={t.topnav.searchPlaceholder} 
                className="pl-10 h-12 text-lg"
                value={query}
                onChange={handleInputChange}
            />
        </div>
    );
};

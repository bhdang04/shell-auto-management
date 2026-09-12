import { useMemo, useState } from "react";

export default function MasterCatalog({ children }) {
    const [search, setSearch] = useState([]);
    const [filterType, setFilterType] = useState("all");

    const filteredItems = useMemo(() => {
        return catalog
            .filter(item => {
                if (filterType !== "all" && item.type.toLowerCase() !== filterType) {
                    return false;
                }
                if (!search.trim()) return true;

                const term = search.toLowerCase();
                return (
                    item.code.toLowerCase().includes(term) ||
                    item.description.toLowerCase().includes(term)
                );
            });
    }, [search, filterType, catalog]);

    if (!isOpen) return null;
    
}
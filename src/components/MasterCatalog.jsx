import { createContext, useContext, useState } from "react";

const MasterCatalog = createContext(null);

export default function MasterCatalog({ children }) {
    const [items, setItems] = useState([]);
    
}
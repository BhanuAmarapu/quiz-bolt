import { Search } from 'lucide-react';
import InputField from './InputField';

const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <InputField
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-400 placeholder:font-medium"
            />
        </div>
    );
};

export default SearchBar;

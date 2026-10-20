import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...', onSubmit }) {
  return (
    <form
      className="search-box"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <FiSearch />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" aria-label="Xóa tìm kiếm" onClick={() => onChange('')}>
          <FiX />
        </button>
      )}
    </form>
  );
}

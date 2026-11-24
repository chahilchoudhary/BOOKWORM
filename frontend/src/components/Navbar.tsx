import { BookOpen, Menu, ShoppingCart, User as UserIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCart } from '../cart';

const links = [
  { to: '/orders', label: 'My Orders' },
  { to: '/wishlist', label: 'My Wishlist' },
  { to: '/writers', label: 'My Writers' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm hover:text-white ${isActive ? 'text-white' : 'text-muted'}`;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas">
      <nav aria-label="Main" className="flex h-12 items-center gap-2 px-4">
        <button className="p-2 md:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/" className="flex items-center gap-2 pr-4 text-sm font-semibold">
          <BookOpen size={20} /> Book Worm
        </Link>
        <div className="hidden items-center border-l border-line pl-2 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link to="/cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`} className="relative p-2">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px]">
                {count}
              </span>
            )}
          </Link>
          <div className="relative">
            <button aria-label="Account menu" aria-expanded={profile} className="p-2" onClick={() => setProfile(!profile)}>
              <UserIcon size={20} />
            </button>
            {profile && (
              <div className="absolute right-0 mt-1 w-56 border border-line bg-panel p-3 text-sm shadow-lg">
                {user ? (
                  <>
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="mb-3 text-xs text-muted">{user.points} gift points</p>
                    <button
                      className="btn-secondary w-full"
                      onClick={() => {
                        logout();
                        setProfile(false);
                        navigate('/');
                      }}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link to="/login" className="btn-primary" onClick={() => setProfile(false)}>
                      Log in
                    </Link>
                    <Link to="/register" className="btn-secondary" onClick={() => setProfile(false)}>
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      {menu && (
        <div className="border-t border-line md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={(s) => `block ${linkClass(s)}`} onClick={() => setMenu(false)}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, ChevronRight, AlertTriangle } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  _count: {
    members: number;
    expenses: number;
  };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = () => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(data => {
        setGroups(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      if (res.ok) {
        setNewGroupName('');
        fetchGroups();
      }
    } catch (error) {
      console.error(error);
    }
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-slate-800/50 rounded-lg w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-800/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Groups</h1>
          <p className="text-slate-400 mt-1">Manage your expense sharing groups</p>
        </div>
      </div>

      <div className="glass-card p-6 animate-fade-in-up animate-fade-in-up-delay-1" style={{ transform: 'none' }}>
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Create New Group</h2>
        <form onSubmit={handleCreateGroup} className="flex gap-3">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="e.g. Ski Trip 2026, Flatmates"
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim() || isCreating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium hover:from-violet-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : (
              <>
                <Plus className="w-5 h-5" />
                Create
              </>
            )}
          </button>
        </form>
      </div>

      <div className="animate-fade-in-up animate-fade-in-up-delay-2">
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Your Groups</h2>
        {groups.length === 0 ? (
          <div className="glass-card p-8 text-center border-dashed border-2 border-slate-700 bg-transparent">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">You don't have any groups yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <Link 
                key={group.id} 
                href={`/groups/${group.id}`}
                className="glass-card p-6 flex flex-col group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-violet-500/30 transition-all"
                style={{ transform: 'none' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">{group.name}</h3>
                  <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-400" />
                  </div>
                </div>
                <div className="mt-auto flex gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    {group._count.members} Members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-slate-600" />
                    {group._count.expenses} Expenses
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

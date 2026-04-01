'use client';

import { useActionState } from 'react';
import { updateFactionApiKeyAction } from '../../lib/actions';

export default function SettingsForm({ factionId }: { factionId: number }) {
  // state will hold our success or error messages
  const [state, formAction, isPending] = useActionState(updateFactionApiKeyAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {/* Pass factionId silently */}
      <input type="hidden" name="factionId" value={factionId} />

      <div>
        <label className="block text-xs uppercase text-gray-500 mb-1">New API Key</label>
        <input 
          type="password" 
          name="apiKey"
          placeholder="Paste Torn API Key here..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
          required
        />
      </div>

      {state?.error && (
        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded border border-green-900">
          {state.success}
        </div>
      )}

      <button 
        type="submit"
        disabled={isPending}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition"
      >
        {isPending ? 'Updating...' : 'Update System Key'}
      </button>
    </form>
  );
}
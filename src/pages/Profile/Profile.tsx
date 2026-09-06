import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  CreditCard,
  Download,
  LogIn,
  LogOut,
  Fingerprint,
  Globe,
  Palette,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Wallet,
} from 'lucide-react'
import type { CurrencyCode } from '@/types'
import { useAppStore } from '@/store/appStore'
import { CURRENCY_LIST } from '@/lib/currency'
import { AVATAR_IMAGE, compressImage } from '@/lib/images'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { SectionHeader } from '@/components/ui/Primitives'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toastContext'
import { useSession } from '@/hooks/useSession'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { deleteAccount, signOut } from '@/lib/supabase/auth'
import { cn } from '@/lib/cn'

export default function Profile() {
  const navigate = useNavigate()
  const toast = useToast()

  const user = useAppStore((s) => s.user)
  const groups = useAppStore((s) => s.groups)
  const friends = useAppStore((s) => s.friends)
  const expenses = useAppStore((s) => s.expenses)
  const preferences = useAppStore((s) => s.preferences)
  const setPreferences = useAppStore((s) => s.setPreferences)
  const updateUser = useAppStore((s) => s.updateUser)
  const resetEverything = useAppStore((s) => s.resetEverything)
  const seedDemo = useAppStore((s) => s.seedDemo)

  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { session } = useSession()
  const [draftName, setDraftName] = useState(user?.name ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  /**
   * Export is a real download of the whole store — the same JSON a future
   * backend would import. No backend means no server-side export to fake.
   */
  const exportData = () => {
    const state = useAppStore.getState()
    const payload = {
      version: state.version,
      exportedAt: new Date().toISOString(),
      user: state.user,
      friends: state.friends,
      groups: state.groups,
      expenses: state.expenses,
      settlements: state.settlements,
      preferences: state.preferences,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sumptus-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.confirm('Data exported')
  }

  const pickAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      updateUser({ avatarUrl: await compressImage(file, AVATAR_IMAGE) })
      toast.confirm('Photo updated')
    } catch {
      toast.notice('That image could not be used. Try another one.')
    }
  }

  return (
    <div>
      <PageHeader title="Profile" backTo="/overview" display={false} />

      <section className="flex items-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full transition-opacity hover:opacity-80"
          aria-label="Change profile picture"
        >
          <Avatar name={user?.name ?? '?'} src={user?.avatarUrl} size="xl" accent />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={pickAvatar} />
        <div className="min-w-0">
          <h1 className="display truncate text-[28px] leading-tight">{user?.name ?? 'You'}</h1>
          <p className="mt-0.5 text-sm text-muted">@{user?.handle ?? 'you'}</p>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
        <Stat label="Groups" value={groups.length} to="/groups" />
        <Stat label="Friends" value={friends.length} to="/friends" />
        <Stat label="Expenses" value={expenses.length} to="/activity" />
      </section>

      <section className="mt-10">
        <SectionHeader title="Preferences" />
        <div className="divide-y divide-line border-t border-line">
          <SettingRow
            icon={<Wallet size={17} strokeWidth={1.6} />}
            label="Currency"
            value={preferences.currency}
            onClick={() => setCurrencyOpen(true)}
          />
          <SettingRow
            icon={<Globe size={17} strokeWidth={1.6} />}
            label="Language"
            value={preferences.language === 'en' ? 'English' : 'Deutsch'}
            onClick={() =>
              setPreferences({ language: preferences.language === 'en' ? 'de' : 'en' })
            }
          />
          <ToggleRow
            icon={<Sparkles size={17} strokeWidth={1.6} />}
            label="Notifications"
            checked={preferences.notifications}
            onChange={(checked) => setPreferences({ notifications: checked })}
          />
          <ToggleRow
            icon={<Palette size={17} strokeWidth={1.6} />}
            label="Reduce motion"
            description="Turns off transitions and counting animations."
            checked={preferences.reduceMotion}
            onChange={(checked) => setPreferences({ reduceMotion: checked })}
          />
          <ToggleRow
            icon={<Play size={17} strokeWidth={1.6} />}
            label="Intro animation"
            description={
              preferences.reduceMotion
                ? 'Held back while Reduce motion is on.'
                : 'Plays the sumptus clip when the app starts cold.'
            }
            checked={preferences.playIntro}
            onChange={(checked) => setPreferences({ playIntro: checked })}
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Account" />
        <div className="divide-y divide-line border-t border-line">
          <SettingRow
            icon={<CreditCard size={17} strokeWidth={1.6} />}
            label="Plan"
            value="Free"
            to="/plan"
          />
          <SettingRow
            icon={<UserCog size={17} strokeWidth={1.6} />}
            label="Personal information"
            onClick={() => {
              setDraftName(user?.name ?? '')
              setEditOpen(true)
            }}
          />
          {/* Only offered where there is something to sign in to. */}
          {isSupabaseConfigured &&
            (session ? (
              <SettingRow
                icon={<LogOut size={17} strokeWidth={1.6} />}
                label="Sign out"
                value={session.user.email ?? undefined}
                onClick={() => setConfirmSignOut(true)}
              />
            ) : (
              <SettingRow
                icon={<LogIn size={17} strokeWidth={1.6} />}
                label="Sign in"
                value="Not signed in"
                to="/sign-in"
              />
            ))}
          <SettingRow
            icon={<Fingerprint size={17} strokeWidth={1.6} />}
            label="Security"
            value={session ? 'Signed in' : 'Device only'}
            onClick={() =>
              toast.notice(
                session
                  ? 'Your account protects what you share. Everything on this device stays readable without it.'
                  : 'Everything stays on this device — nothing to secure remotely yet.',
              )
            }
          />
          <SettingRow
            icon={<ShieldCheck size={17} strokeWidth={1.6} />}
            label="Privacy"
            value={session ? 'Shared groups sync' : 'No data leaves the device'}
            onClick={() =>
              toast.notice(
                session
                  ? 'Only groups you share leave this device, and only to the people in them.'
                  : 'sumptus sends nothing anywhere. No accounts, no servers.',
              )
            }
          />
          <SettingRow
            icon={<Download size={17} strokeWidth={1.6} />}
            label="Export data"
            onClick={exportData}
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Data" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await seedDemo()
              toast.confirm('Demo data restored')
              navigate('/overview')
            }}
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Reload demo data
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Erase everything
          </Button>
          {isSupabaseConfigured && session && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          )}
        </div>
        <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted">
          sumptus keeps all of this in your browser&rsquo;s local storage. Clearing site data
          removes it permanently, so export first if it matters.
        </p>
      </section>

      <Sheet open={currencyOpen} onOpenChange={setCurrencyOpen} title="Currency">
        <div className="divide-y divide-line pb-4">
          {CURRENCY_LIST.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                setPreferences({ currency: option.code as CurrencyCode })
                setCurrencyOpen(false)
              }}
              className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-surface/60"
            >
              <span className="w-8 text-[15px] text-muted">{option.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-[15px]">{option.name}</span>
              <span
                className={cn(
                  'text-[13px]',
                  preferences.currency === option.code ? 'text-navy' : 'text-muted',
                )}
              >
                {option.code}
              </span>
            </button>
          ))}
        </div>
        <p className="pb-4 text-[13px] leading-relaxed text-muted">
          Changing this sets the default for new groups. Existing groups keep the currency they
          were created with.
        </p>
      </Sheet>

      <Sheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Personal information"
        footer={
          <Button
            full
            size="lg"
            disabled={!draftName.trim()}
            onClick={() => {
              updateUser({
                name: draftName.trim(),
                handle: draftName.trim().toLowerCase().replace(/\s+/g, ''),
              })
              setEditOpen(false)
              toast.confirm('Saved')
            }}
          >
            Save
          </Button>
        }
      >
        <Field label="Name">
          {({ id }) => (
            <Input
              id={id}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              autoFocus
            />
          )}
        </Field>
      </Sheet>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        body="Everything on this device stays exactly where it is. Sign back in whenever you want."
        confirmLabel="Sign out"
        onConfirm={async () => {
          try {
            await signOut()
            toast.confirm('Signed out')
          } catch {
            toast.notice('Could not sign out. Try again in a moment.')
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        body="Your account and everything shared through it is removed for good. Data held only on this device is untouched — erase that separately if you want it gone."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          try {
            await deleteAccount()
            toast.confirm('Account deleted')
          } catch {
            toast.notice('Could not delete the account. Try again in a moment.')
          }
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Erase everything?"
        body="Every group, expense and settlement on this device is deleted. This can't be undone."
        confirmLabel="Erase"
        destructive
        onConfirm={async () => {
          await resetEverything()
          navigate('/', { replace: true })
        }}
      />
    </div>
  )
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="bg-canvas px-4 py-4 transition-colors hover:bg-surface/60">
      <p className="tnum text-[22px] font-medium">{value}</p>
      <p className="mt-0.5 text-[13px] text-muted">{label}</p>
    </Link>
  )
}

/**
 * Rows that open a sheet stay buttons; rows that go somewhere become links, so
 * they can be opened in a new tab and announce themselves as navigation.
 */
function SettingRow({
  icon,
  label,
  value,
  onClick,
  to,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
  to?: string
}) {
  const classes =
    'flex w-full items-center gap-3 py-4 text-left transition-colors duration-micro hover:bg-surface/60'

  const content = (
    <>
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[15px]">{label}</span>
      {value && <span className="shrink-0 text-[13px] text-muted">{value}</span>}
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-muted/60" />
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-4">
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors duration-micro',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-navy peer-focus-visible:ring-offset-2',
          checked ? 'bg-navy' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-canvas shadow-paper transition-transform duration-micro ease-out',
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
          )}
        />
      </span>
    </label>
  )
}

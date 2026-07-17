"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Menu, X, Stethoscope, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut, loading } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-md">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AI Skin Specialist</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
              Home
            </Link>
            <Link href="/consult/new" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
              Consultation
            </Link>
            <Link href="/conditions" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
              Conditions
            </Link>
            {user && (
              <Link href="/diary" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
                Skin Diary
              </Link>
            )}
          </div>

          <div className="hidden md:flex md:items-center md:gap-3">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-teal-500 text-white text-sm">
                        {(user.display_name || user.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer"><UserIcon className="h-4 w-4 mr-2" /> Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/login?signup=true">
                  <Button size="sm" className="shadow-md">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-accent">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={cn("md:hidden border-t border-border/40 overflow-hidden transition-all duration-300", mobileOpen ? "max-h-80" : "max-h-0")}>
        <div className="space-y-1 px-4 py-3">
          <Link href="/" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link href="/consult/new" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent" onClick={() => setMobileOpen(false)}>Consultation</Link>
          <Link href="/conditions" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent" onClick={() => setMobileOpen(false)}>Conditions</Link>
          {user && (
            <>
              <Link href="/diary" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent" onClick={() => setMobileOpen(false)}>Skin Diary</Link>
              <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            </>
          )}
          <div className="pt-2 space-y-2">
            {user ? (
              <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => { signOut(); setMobileOpen(false) }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                <Link href="/login?signup=true" onClick={() => setMobileOpen(false)}><Button size="sm" className="w-full">Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

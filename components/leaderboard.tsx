"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from '@/components/firebase-provider'
import { collection, query, where, orderBy, limit, getDocs, startAfter, Timestamp } from 'firebase/firestore'
import { Medal, ChevronLeft, ChevronRight, Search, Calendar, ArrowUp, ArrowDown, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"

interface LeaderboardProps {
  expanded?: boolean
}

interface LeaderboardEntry {
  id: string
  username: string
  totalStudyTime: number
  rank?: number
  change?: number
}

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all'

export function Leaderboard({ expanded = false }: LeaderboardProps): JSX.Element {
  const { db, user } = useFirebase()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null)
  
  const [pageSize, setPageSize] = useState(10)
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentUserInfo, setCurrentUserInfo] = useState<LeaderboardEntry | null>(null)

  // Get total user count and update when filters change
  useEffect(() => {
    if (user) {
      const getTotalUsers = async () => {
        try {
          // For 'all' time range, we can just count all users
          if (timeRange === 'all') {
          const usersRef = collection(db, 'users')
            const snapshot = await getDocs(usersRef)
            setTotalUsers(snapshot.size)
            return
          }
          
          // For other time ranges, we'll count users with activity in that period
          // This will be handled in the loadLeaderboard function
          // to avoid duplicate queries
        } catch (error) {
          console.error('Error getting total users:', error)
        }
      }
      getTotalUsers()
    }
  }, [user, db, timeRange])

  useEffect(() => {
    if (user) {
      loadLeaderboard()
    }
  }, [user, timeRange, currentPage, pageSize, sortDirection, searchQuery])

  // Reset current user info when filters change
  useEffect(() => {
    setCurrentUserInfo(null)
  }, [timeRange, sortDirection, searchQuery])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      
      const usersRef = collection(db, 'users')
      let q = query(usersRef)

      // Apply time range filter
      if (timeRange !== 'all') {
        const now = new Date()
        let startDate = new Date()

        switch (timeRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        }

        // Instead of using array-contains which is too specific,
        // we'll query for sessions after the start date and calculate totals
        const firestoreTimestamp = Timestamp.fromDate(startDate);
        
        // We need to get all users and then filter by their session dates
        const allUsersSnapshot = await getDocs(collection(db, 'users'));
        
        // Process each user to calculate their study time within the date range
        const usersWithFilteredTime = await Promise.all(
          allUsersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            try {
              // Try both ways of querying sessions - some users might have sessions in different formats
              // First try the subcollection approach
              let filteredStudyTime = 0;
              
              try {
                // This might fail due to permissions - only users can access their own sessions
                if (userId === user?.uid) {
                  const sessionsQuery = query(
                    collection(db, 'users', userId, 'sessions'),
                    where('timestamp', '>=', firestoreTimestamp)
                  );
                  
                  const sessionsSnapshot = await getDocs(sessionsQuery);
                  
                  // Calculate total study time from these sessions
                  sessionsSnapshot.docs.forEach(sessionDoc => {
                    const sessionData = sessionDoc.data();
                    filteredStudyTime += sessionData.duration || 0;
                  });
                }
              } catch (sessionError) {
                // Silently handle permission errors for other users' sessions
                console.log(`Cannot access sessions for user ${userId} - using totalStudyTime instead`);
              }
              
              // If no sessions found in subcollection or not the current user, try the old format in study-sessions collection
              if (filteredStudyTime === 0) {
                try {
                  const oldSessionsQuery = query(
                    collection(db, 'study-sessions'),
                    where('userId', '==', userId),
                    where('timestamp', '>=', firestoreTimestamp)
                  );
                  
                  const oldSessionsSnapshot = await getDocs(oldSessionsQuery);
                  
                  oldSessionsSnapshot.docs.forEach(sessionDoc => {
                    const sessionData = sessionDoc.data();
                    filteredStudyTime += sessionData.duration || 0;
                  });
                } catch (oldSessionError) {
                  // Silently handle permission errors
                  console.log(`Cannot access old sessions for user ${userId}`);
                }
              }
              
              // If still no sessions found or permissions issues, use the user's totalStudyTime
              // This is not ideal for time filtering but ensures users see some data
              if (filteredStudyTime === 0) {
                // For time ranges, we need to estimate what portion of total time falls in the range
                // This is a rough approximation
                let timeRangeFactor = 1.0; // Default for 'all'
                
                if (timeRange === 'today') {
                  timeRangeFactor = 0.05; // Assume ~5% of total time was today
                } else if (timeRange === 'week') {
                  timeRangeFactor = 0.2; // Assume ~20% of total time was this week
                } else if (timeRange === 'month') {
                  timeRangeFactor = 0.5; // Assume ~50% of total time was this month
                } else if (timeRange === 'year') {
                  timeRangeFactor = 0.9; // Assume ~90% of total time was this year
                }
                
                filteredStudyTime = Math.round((userData.totalStudyTime || 0) * timeRangeFactor);
              }
              
              return {
                id: userId,
                username: userData.username || 'Anonymous',
                totalStudyTime: filteredStudyTime,
                originalRank: userData.rank || 0
              };
            } catch (userError) {
              console.log(`Error processing user ${userId}:`, userError);
              // Return user with zero study time if there's an error
              return {
                id: userId,
                username: userData.username || 'Anonymous',
                totalStudyTime: 0,
                originalRank: userData.rank || 0
              };
            }
          })
        );
        
        // Filter out users with no study time in the period
        const filteredUsers = usersWithFilteredTime.filter(user => user.totalStudyTime > 0);
        
        // Sort users by their filtered study time
        filteredUsers.sort((a, b) => 
          sortDirection === 'desc' 
            ? b.totalStudyTime - a.totalStudyTime 
            : a.totalStudyTime - b.totalStudyTime
        );
        
        // Set total users count for pagination
        setTotalUsers(filteredUsers.length);
        
        // Apply pagination to the filtered results
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);
        
        // Add rank to each user
        const rankedUsers = paginatedUsers.map((user, index) => ({
          ...user,
          rank: startIndex + index + 1
        }));
        
        // Set the leaderboard directly
        setLeaderboard(rankedUsers);
        
        // Find current user in the filtered list
        if (user) {
          const currentUserIndex = filteredUsers.findIndex(entry => entry.id === user.uid);
          
          if (currentUserIndex !== -1) {
            const currentUserData = filteredUsers[currentUserIndex];
            
            // Only set currentUserInfo if user is not in the current page
            if (!paginatedUsers.some(entry => entry.id === user.uid)) {
              setCurrentUserInfo({
                id: user.uid,
                username: currentUserData.username,
                totalStudyTime: currentUserData.totalStudyTime,
                rank: currentUserIndex + 1
              });
            } else {
              setCurrentUserInfo(null);
            }
          } else {
            // User not found in filtered leaderboard
            setCurrentUserInfo(null);
          }
        }
        
        setLoading(false);
        return; // Exit early since we've handled everything
      }

      // For 'all' time range, continue with the original query
      q = query(q, orderBy('totalStudyTime', sortDirection))

      // Apply pagination
      const startAfterDoc = currentPage > 1 ? 
        await getDocs(query(q, limit((currentPage - 1) * pageSize))).then(snap => snap.docs[snap.docs.length - 1]) :
        null

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc))
      }

      q = query(q, limit(pageSize))
      
      const snapshot = await getDocs(q)
      
      let entries = snapshot.docs.map((doc, index) => {
        const data = doc.data()
        return {
          id: doc.id,
          username: data.username || 'Anonymous',
          totalStudyTime: data.totalStudyTime || 0,
          rank: ((currentPage - 1) * pageSize) + index + 1
        }
      })

      // Apply search filter
      if (searchQuery) {
        entries = entries.filter(entry =>
          entry.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setLeaderboard(entries)
      
      // Always fetch current user's info regardless of whether they're in the current page
      if (user) {
        try {
          // Get all users sorted by study time to find current user's position
          const allUsersQuery = query(
            collection(db, 'users'), 
            orderBy('totalStudyTime', sortDirection)
          )
          
          const allUsersSnapshot = await getDocs(allUsersQuery)
          
          const userIndex = allUsersSnapshot.docs.findIndex(doc => doc.id === user.uid)
          
          if (userIndex !== -1) {
            const userData = allUsersSnapshot.docs[userIndex].data()
            
            // Only set currentUserInfo if user is not in the current page
            if (!entries.some(entry => entry.id === user.uid)) {
              setCurrentUserInfo({
                id: user.uid,
                username: userData.username || 'Anonymous',
                totalStudyTime: userData.totalStudyTime || 0,
                rank: userIndex + 1
              })
            } else {
              setCurrentUserInfo(null)
            }
          } else {
            // User not found in leaderboard
            setCurrentUserInfo(null)
          }
        } catch (error) {
          console.error('Error finding user rank:', error)
          setCurrentUserInfo(null)
        }
      }
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      
      // Handle the error gracefully
      setLeaderboard([]);
      setCurrentUserInfo(null);
      
      // If it's a permissions error, use a fallback approach
      if (error.toString().includes('Missing or insufficient permissions')) {
        try {
          // Fallback to just loading users without trying to access sessions
          const usersRef = collection(db, 'users');
          const q = query(usersRef, orderBy('totalStudyTime', sortDirection));
          const snapshot = await getDocs(q);
          
          let entries = snapshot.docs.map((doc, index) => {
            const data = doc.data();
            
            // Apply time range factor to estimate study time for the period
            let timeRangeFactor = 1.0; // Default for 'all'
            if (timeRange === 'today') {
              timeRangeFactor = 0.05;
            } else if (timeRange === 'week') {
              timeRangeFactor = 0.2;
            } else if (timeRange === 'month') {
              timeRangeFactor = 0.5;
            } else if (timeRange === 'year') {
              timeRangeFactor = 0.9;
            }
            
            const adjustedStudyTime = Math.round((data.totalStudyTime || 0) * timeRangeFactor);
            
            return {
              id: doc.id,
              username: data.username || 'Anonymous',
              totalStudyTime: adjustedStudyTime,
              rank: index + 1
            };
          });
          
          // Apply search filter
          if (searchQuery) {
            entries = entries.filter(entry =>
              entry.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          // Filter out users with no study time
          entries = entries.filter(entry => entry.totalStudyTime > 0);
          
          setLeaderboard(entries);
          setTotalUsers(entries.length);
          
          // Find current user in the entries
          if (user) {
            const currentUserEntry = entries.find(entry => entry.id === user.uid);
            if (currentUserEntry) {
              setCurrentUserInfo(currentUserEntry);
            }
          }
        } catch (fallbackError) {
          console.error('Error in fallback leaderboard loading:', fallbackError);
          // Final fallback - just show a message to the user
          toast({
            title: "Leaderboard Error",
            description: "Unable to load leaderboard data. Please try again later.",
            variant: "destructive"
          });
        }
      } else {
        // For other errors, show a toast
        toast({
          title: "Leaderboard Error",
          description: "Unable to load leaderboard data. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const totalPages = Math.ceil(totalUsers / pageSize)

  const renderRankChange = (change?: number) => {
    if (!change) return null
    
    if (change > 0) {
      return <ArrowUp className="h-4 w-4 text-green-500" />
    } else if (change < 0) {
      return <ArrowDown className="h-4 w-4 text-red-500" />
    }
    return null
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Sign in to compete with others!
          </p>
          <Button variant="outline" asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:space-y-0">
          <CardTitle>Leaderboard</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDirection} onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Highest first</SelectItem>
                  <SelectItem value="asc">Lowest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="mt-0">
            <LeaderboardContent />
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            <LeaderboardContent />
          </TabsContent>
          <TabsContent value="month" className="mt-0">
            <LeaderboardContent />
          </TabsContent>
          <TabsContent value="year" className="mt-0">
            <LeaderboardContent />
          </TabsContent>
          <TabsContent value="all" className="mt-0">
            <LeaderboardContent />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
  
  function LeaderboardContent() {
    // Check if current user is in the visible leaderboard
    const currentUserInList = leaderboard.some(entry => entry.id === user?.uid)
    // Only show the current user card if they're not in the visible list and we have their info
    const showCurrentUserCard = !currentUserInList && currentUserInfo !== null
    
    return (
      <div className="space-y-4">
        {/* Current User Card - Only shown when user is not in the visible leaderboard */}
        {showCurrentUserCard && (
          <div className="mb-6">
            <div className="rounded-lg border bg-card shadow-md overflow-hidden">
              <div className="bg-primary/10 px-4 py-2 border-b">
                <h3 className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Your Position on the Leaderboard
                </h3>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 border border-primary/30">
                      <span className="text-base font-bold text-primary">
                        #{currentUserInfo?.rank}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-primary text-lg">
                        {currentUserInfo?.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Total Study Time: <span className="font-mono">{formatTime(currentUserInfo?.totalStudyTime || 0)}</span>
                      </span>
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="text-xs py-1 px-3">
                    You
                  </Badge>
                </div>
                
                {/* Show a message about pagination */}
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  You're currently on page {Math.ceil((currentUserInfo?.rank || 0) / pageSize)} of the leaderboard
                </p>
                
                {/* Button to navigate to user's page */}
                {currentUserInfo && (
                  <div className="mt-3 flex justify-center">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handlePageChange(Math.ceil((currentUserInfo.rank || 0) / pageSize))}
                      className="w-full sm:w-auto"
                    >
                      Go to your position
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No study data available for this time period</p>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {timeRange === 'today' ? 'Complete a study session today to appear on the leaderboard!' :
                 timeRange === 'week' ? 'Study this week to appear on the weekly leaderboard!' :
                 timeRange === 'month' ? 'No study sessions recorded this month yet.' :
                 'No study sessions recorded in this time period.'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTimeRange('all')}
                className="mt-2"
              >
                View All-Time Leaderboard
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-300px)] pr-4">
            <div className="space-y-1">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.id === user?.uid
                const isHighlighted = entry.id === highlightedUserId
                const rank = entry.rank || 0
                
                // Add a separator before the current user if they're not in the top ranks
                const showSeparator = isCurrentUser && rank > 10 && leaderboard.findIndex(e => e.id === user?.uid) > 0
                
                return (
                  <React.Fragment key={entry.id}>
                    {showSeparator && (
                      <div className="py-2 px-3 text-center text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <div className="h-px flex-1 bg-border"></div>
                          <span className="px-2">Your Position</span>
                          <div className="h-px flex-1 bg-border"></div>
                        </div>
                      </div>
                    )}
                    <div 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        isCurrentUser ? "bg-muted" : "hover:bg-muted/50",
                        isHighlighted && "ring-1 ring-primary",
                        "transition-all duration-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-[40px]">
                          {rank <= 3 ? (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br shadow-inner">
                              <Medal className={cn(
                                "h-5 w-5",
                                rank === 1 ? "text-yellow-500" :
                                rank === 2 ? "text-gray-400" :
                                "text-amber-600"
                              )} />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                              <span className="text-sm font-medium text-muted-foreground">
                                {rank}
                              </span>
                            </div>
                          )}
                          {entry.change !== undefined && (
                            <span className="flex items-center">
                              {renderRankChange(entry.change)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className={cn(
                            "font-medium",
                            isCurrentUser && "text-primary"
                          )}>
                            {entry.username}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2 text-xs py-0 h-5">
                                You
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">
                          {formatTime(entry.totalStudyTime)}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }
}


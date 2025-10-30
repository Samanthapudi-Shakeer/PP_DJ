import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { usePlanCycle } from "../context/PlanCycleContext";
import { broadcastSessionLogout } from "../utils/session";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import { Button } from "components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle,CardFooter } from "components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "components/ui/dialog";
import { Input } from "components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert";
import { Badge } from "components/ui/badge";
import { ScrollArea } from "components/ui/scroll-area";
import { Separator } from "components/ui/separator";
import { Avatar, AvatarFallback } from "components/ui/avatar";
import { Sparkles, Plus, LogOut, Pencil } from "lucide-react";

const PlanCyclesList = () => {
  const navigate = useNavigate();
  const { planCycle, setSelectedPlanCycle } = usePlanCycle();
  const { searchTerm, setSearchTerm } = useGlobalSearch();
  const [planCycles, setPlanCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editFormData, setEditFormData] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isEditor = ["admin", "editor"].includes(currentUser.role);
  const initials = (currentUser.username || "Planner")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  useEffect(() => {
    const fetchPlanCycles = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/plan-cycles`);
        setPlanCycles(response.data);
      } catch (fetchError) {
        setError(fetchError.response?.data?.detail || "Failed to load plan cycles");
      } finally {
        setLoading(false);
      }
    };

    fetchPlanCycles();
  }, []);

  const handleCreatePlanCycle = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API}/plan-cycles`, formData);
      setPlanCycles((previous) => [response.data, ...previous]);
      setSelectedPlanCycle(response.data);
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
      setSuccess("Plan cycle created successfully!");
      setTimeout(() => setSuccess(""), 3200);
      navigate(`/plan-cycles/${response.data.id}/projects`);
    } catch (createError) {
      setError(createError.response?.data?.detail || "Failed to create plan cycle");
    }
  };

  const handleUpdatePlanCycle = async (event) => {
    event.preventDefault();
    if (!editingCycle) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await axios.put(`${API}/plan-cycles/${editingCycle.id}`, editFormData);
      setPlanCycles((previous) =>
        previous.map((cycle) => (cycle.id === editingCycle.id ? response.data : cycle))
      );
      if (planCycle?.id === editingCycle.id) {
        setSelectedPlanCycle(response.data);
      }
      setEditDialogOpen(false);
      setEditingCycle(null);
      setEditFormData({ name: "", description: "" });
      setSuccess("Plan cycle updated successfully!");
      setTimeout(() => setSuccess(""), 3200);
    } catch (updateError) {
      setError(updateError.response?.data?.detail || "Failed to update plan cycle");
    }
  };

  const openEditDialog = (cycle) => {
    setEditingCycle(cycle);
    setEditFormData({ name: cycle.name, description: cycle.description || "" });
    setEditDialogOpen(true);
  };

  const handleEditDialogChange = (open) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingCycle(null);
      setEditFormData({ name: "", description: "" });
    }
  };

  const handleSelectPlanCycle = (cycle) => {
    setSelectedPlanCycle(cycle);
    navigate(`/plan-cycles/${cycle.id}/projects`);
  };

  const handleLogout = () => {
    broadcastSessionLogout();
    setSearchTerm("");
    setSelectedPlanCycle(null);
    navigate("/login");
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPlanCycles = useMemo(
    () =>
      planCycles.filter((cycle) => {
        const haystack = `${cycle.name} ${cycle.description || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [planCycles, normalizedSearch]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <div className="mx-auto flex w-full flex-col gap-10 px-6 py-10 sm:px-10">
        <section className="relative overflow-hidden rounded-3xl bg-white/90 p-10 text-slate-700 shadow-xl backdrop-blur-sm">
          <div className="absolute -left-32 top-20 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" aria-hidden="true" />
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge className="bg-indigo-100 text-indigo-700 shadow-sm" variant="secondary">
                <Sparkles className="mr-1 h-4 w-4" />Toshiba Software India Private Ltd
              </Badge>
              <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Plan Cycles
              </h1>
              <p className="text-sm text-slate-600 sm:text-base">
                Choose a plan cycle to view and manage its projects.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span>Showing {planCycles.length} Plan Cycles</span>
                </div>
              </div>
            </div>
            <Card className="w-full max-w-sm bg-white/95 text-slate-700 shadow-lg backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-slate-900">
                  {currentUser.username || "Planner"}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  {planCycle ? `Working on ${planCycle.name}` : "Select a plan cycle to continue."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-4 pb-0">
                <Avatar className="h-12 w-12 border border-indigo-100 bg-indigo-50">
                  <AvatarFallback className="bg-indigo-100 text-lg text-indigo-600">
                    {initials || "PC"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="capitalize">{currentUser.role || "viewer"}</span>
                  </div>
                  <p className="text-xs text-slate-500">Authenticated and synced</p>
                </div>
              </CardContent>
              <CardFooter className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  className="bg-rose-400 hover:bg-rose-500"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          {success && (
            <Alert className="border border-emerald-200 bg-emerald-50 text-emerald-700">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="border border-red-200 bg-red-50 text-red-700">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-white text-slate-800 shadow-xl">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Plan Cycles</CardTitle>
                <CardDescription className="text-slate-500">
                  Select a plan cycle to continue working.
                </CardDescription>
              </div>
              {isEditor && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                      <Plus className="mr-2 h-4 w-4" /> Add Plan Cycle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border border-slate-200 bg-white text-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900">Add Plan Cycle</DialogTitle>
                      <DialogDescription className="text-slate-500">
                        Give your plan cycle a name and optional description.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreatePlanCycle} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600" htmlFor="plan-cycle-name">
                          Plan Cycle name
                        </label>
                        <Input
                          id="plan-cycle-name"
                          required
                          value={formData.name}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, name: event.target.value }))
                          }
                          placeholder="Enter Plan Cycle Name"
                          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600" htmlFor="plan-cycle-description">
                          Description (optional)
                        </label>
                        <textarea
                          id="plan-cycle-description"
                          value={formData.description}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, description: event.target.value }))
                          }
                          placeholder="Enter Description"
                          className="min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        />
                      </div>
                      <DialogFooter className="sm:justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-slate-500 hover:bg-slate-100"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-indigo-500 text-white hover:bg-indigo-600">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Plan Cycle
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="global-search-status">
                  {searchTerm && (
                    <div className="search-status-active">
                      <span>
                        Filtering plan cycles for <strong>"{searchTerm}"</strong>
                      </span>
                      <button
                        type="button"
                        className="clear-search-button"
                        onClick={() => setSearchTerm("")}
                        data-testid="clear-plan-cycle-search"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
                <Badge className="bg-indigo-100 text-indigo-600">
                  {filteredPlanCycles.length} cycle{filteredPlanCycles.length === 1 ? "" : "s"} in view
                </Badge>
              </div>
              <Separator className="border-slate-200" />

              {loading ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500">
                  <Sparkles className="h-6 w-6 animate-spin text-indigo-400" />
                  <p className="text-sm">Fetching plan cycles...</p>
                </div>
              ) : filteredPlanCycles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500">
                  <p className="text-lg font-semibold text-slate-700">No plan cycles available</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {searchTerm
                      ? "Try a different search query or clear your filters."
                      : "Create your first plan cycle to begin."}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full max-h-[600px] pr-2">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPlanCycles.map((cycle) => (
                      <Card
                        key={cycle.id}
                        className="group flex cursor-pointer flex-col justify-between border-slate-200 bg-white text-slate-800 transition duration-200 hover:border-indigo-200 hover:bg-indigo-50/40"
                        onClick={() => handleSelectPlanCycle(cycle)}
                        data-testid={`plan-cycle-card-${cycle.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-xl font-semibold text-slate-900 group-hover:text-indigo-600">
                                {cycle.name}
                              </CardTitle>
                              <CardDescription className="mt-2 text-sm text-slate-500">
                                {cycle.description || "No description provided."}
                              </CardDescription>
                            </div>
                            <div className="flex items-start gap-2">
                              {isEditor && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-slate-500 hover:text-indigo-600"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditDialog(cycle);
                                  }}
                                  data-testid={`edit-plan-cycle-${cycle.id}`}
                                  aria-label={`Edit ${cycle.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-600">
                                {new Date(cycle.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="text-xs uppercase tracking-wide text-slate-500">
                          CID: {cycle.id.split("-")[0]}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      {isEditor && (
        <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
          <DialogContent className="border border-slate-200 bg-white text-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Edit Plan Cycle</DialogTitle>
              <DialogDescription className="text-slate-500">
                Update the plan cycle name or description.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePlanCycle} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600" htmlFor="edit-plan-cycle-name">
                  Plan Cycle name
                </label>
                <Input
                  id="edit-plan-cycle-name"
                  required
                  value={editFormData.name}
                  onChange={(event) =>
                    setEditFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Enter Plan Cycle Name"
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-600"
                  htmlFor="edit-plan-cycle-description"
                >
                  Description (optional)
                </label>
                <textarea
                  id="edit-plan-cycle-description"
                  value={editFormData.description}
                  onChange={(event) =>
                    setEditFormData((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Enter Description"
                  className="min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                />
              </div>
              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-500 hover:bg-slate-100"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-500 text-white hover:bg-indigo-600">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PlanCyclesList;


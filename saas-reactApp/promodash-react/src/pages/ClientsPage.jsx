import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

export default function ClientsPage() {
  const { state, loadClients, loadProjects, loadPromotions, deleteClient } = useApp();
  const [modal,   setModal]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadClients(), loadProjects(), loadPromotions()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (clientId) => {
    const client = state.clients.find((c) => c.id === clientId);
    if (!client || !window.confirm(`Delete client "${client.name}" and remove their assignments?`)) return;
    try {
      await deleteClient(clientId);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="empty">Loading clients…</div>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="muted">Add client users, then assign their email to specific projects.</p>
        </div>
        <button className="btn" onClick={() => setModal({ type: "client" })}>
          <Icon name="plus" /> Client
        </button>
      </section>

      <div className="list">
        {state.clients.length
          ? state.clients.map((client) => {
              const assignedProjects = state.projects.filter((p) => p.clientUsers?.includes(client.email));
              const projectIds       = new Set(assignedProjects.map((p) => p.id));
              const promoCount       = state.promotions.filter((p) => projectIds.has(p.projectId)).length;
              return (
                <article key={client.id} className="card">
                  <div className="card-head">
                    <div>
                      <h3>{client.name}</h3>
                      <p className="muted">{client.company}</p>
                      <div className="meta-line">
                        <span>{client.email}</span>
                        <span>{assignedProjects.length} projects</span>
                        <span>{promoCount} promotions</span>
                      </div>
                    </div>
                    <div className="toolbar">
                      <button className="btn secondary small" onClick={() => setModal({ type: "client", context: { id: client.id } })}>
                        <Icon name="edit" /> Edit
                      </button>
                      <button className="btn danger small" onClick={() => handleDelete(client.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })
          : <div className="empty">No clients yet.</div>}
      </div>

      {modal && (
        <Modal
          type={modal.type}
          context={modal.context || {}}
          onClose={() => { setModal(null); loadClients(); }}
        />
      )}
    </>
  );
}

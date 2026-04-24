import { useState } from "react";
import { useApp } from "../context/AppContext";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

export default function ClientsPage() {
  const { state, setState } = useApp();
  const [modal, setModal] = useState(null);

  const handleDelete = (clientId) => {
    const client = state.clients.find((c) => c.id === clientId);
    if (!client || !window.confirm(`Delete client "${client.name}" and remove their assignments?`)) return;
    setState({
      clients: state.clients.filter((c) => c.id !== clientId),
      projects: state.projects.map((p) => ({
        ...p,
        clientUsers: p.clientUsers.filter((email) => email !== client.email),
      })),
    });
  };

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="muted">Add client users, then assign their email to specific projects and promotions.</p>
        </div>
        <button className="btn" onClick={() => setModal({ type: "client" })}>
          <Icon name="plus" /> Client
        </button>
      </section>
      <div className="list">
        {state.clients.length
          ? state.clients.map((client) => {
              const projectCount = state.projects.filter((p) => p.clientUsers.includes(client.email)).length;
              const projectIds = new Set(state.projects.filter((p) => p.clientUsers.includes(client.email)).map((p) => p.id));
              const promoCount = state.promotions.filter((p) => projectIds.has(p.projectId)).length;
              return (
                <article key={client.id} className="card">
                  <div className="card-head">
                    <div>
                      <h3>{client.name}</h3>
                      <p className="muted">{client.company}</p>
                      <div className="meta-line">
                        <span>{client.email}</span>
                        <span>{projectCount} projects</span>
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
        <Modal type={modal.type} context={modal.context || {}} onClose={() => setModal(null)} />
      )}
    </>
  );
}

import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

export default function TypesPage() {
  const { state, loadTypes, loadPromotions, deleteType } = useApp();
  const [modal,   setModal]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadTypes(), loadPromotions()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (typeId) => {
    const type  = state.promotionTypes.find((t) => t.id === typeId);
    const usage = state.promotions.filter((p) => p.type === typeId).length;
    if (!type) return;
    if (usage > 0) {
      window.alert("This type is used by promotions. Move or delete those first.");
      return;
    }
    if (!window.confirm(`Delete promotion type "${type.name}"?`)) return;
    try {
      await deleteType(typeId);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="empty">Loading types…</div>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Promotion Types</h1>
          <p className="muted">Manage the campaign categories admins choose when creating promotions.</p>
        </div>
        <button className="btn" onClick={() => setModal({ type: "type" })}>
          <Icon name="plus" /> Type
        </button>
      </section>

      <div className="list">
        {state.promotionTypes.length
          ? state.promotionTypes.map((t) => {
              const usage = state.promotions.filter((p) => p.type === t.id).length;
              return (
                <article key={t.id} className="card">
                  <div className="card-head">
                    <div>
                      <h3>{t.name}</h3>
                      <p className="muted">{t.description}</p>
                      <div className="meta-line"><span>{usage} promotions</span></div>
                    </div>
                    <div className="toolbar">
                      <button className="btn secondary small" onClick={() => setModal({ type: "type", context: { id: t.id } })}>
                        <Icon name="edit" /> Edit
                      </button>
                      <button className="btn danger small" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })
          : <div className="empty">No promotion types yet.</div>}
      </div>

      {modal && (
        <Modal
          type={modal.type}
          context={modal.context || {}}
          onClose={() => { setModal(null); loadTypes(); }}
        />
      )}
    </>
  );
}

import EditForm from './EditForm';

export default function EditBeneficiarioPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return <EditForm id={id} />;
}
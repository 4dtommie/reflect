export async function load({ params }: { params: { id: string } }) {
	return {
		categoryId: parseInt(params.id)
	};
}

